'use strict';

/**
 * 道路資料建置（OSM JSON → roads.json）
 *
 * Pipeline:
 *   1. 載入 OSM JSON（pbf_to_json.cjs 產出）
 *   2. 索引節點 → 座標
 *   3. 過濾可接受的 highway 類型
 *   4. 構建交叉路口圖
 *   5. 對每條 way：
 *      - 解析多語種名稱
 *      - 解析 turn:lanes（含 forward/backward/both）
 *      - 解決單向 / 車道數
 *      - 路徑去重 + RDP 簡化
 *      - 按路口 + 道路等級切段
 *      - 微段合併
 *      - 在有真實路口的端點用 lane-inferrer 推斷
 *   6. 套用手動修正
 *   7. 合併相鄰相容路段
 *   8. 重新編號、清理內部欄位
 *   9. 輸出 + 統計報告
 */

const fs = require('fs');
const path = require('path');

const geo = require('./lib/geo.cjs');
const { resolveName } = require('./lib/name-resolver.cjs');
const { parseTurnLanes } = require('./lib/lane-parser.cjs');
const { buildIntersectionGraph, MIN_INTERSECTION_BRANCHES } = require('./lib/intersection-graph.cjs');
const { preprocessWay, mergeMicroSegments } = require('./lib/segmenter.cjs');
const { inferLanesForEndpoint, endpointBearing, startBearing } = require('./lib/lane-inferrer.cjs');
const { loadOverrides, applyOverrides } = require('./lib/overrides.cjs');
const {
  isOneway,
  resolveLaneCounts,
  defaultStraightLanes,
  buildRoad,
  mergeRoads,
  finalize,
} = require('./lib/road-builder.cjs');
const { loadExclusions, shouldExclude } = require('./lib/exclusions.cjs');
const { summarize, formatReport } = require('./lib/stats.cjs');

const ACCEPTED_HIGHWAYS = new Set([
  'motorway', 'motorway_link', 'trunk', 'trunk_link',
  'primary', 'primary_link', 'secondary', 'secondary_link',
  'tertiary', 'tertiary_link',
  'residential', 'unclassified', 'living_street', 'road',
  'service',
]);

const args = parseArgs(process.argv.slice(2));
const city = args.city || 'macau';
const cityDir = path.join(__dirname, '..', 'public', 'data', city);
const inputFile = args.input || path.join(cityDir, 'osm_fr.json');
const outputFile = args.output || path.join(cityDir, 'roads.json');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--input' || a === '-i') out.input = argv[++i];
    else if (a === '--output' || a === '-o') out.output = argv[++i];
    else if (a === '--exclude-file') out.excludeFile = argv[++i];
    else if (a === '--no-merge') out.noMerge = true;
    else if (a === '--no-rdp') out.noRdp = true;
    else if (a === '--no-overrides') out.noOverrides = true;
    else if (a === '-h' || a === '--help') {
      printHelp();
      process.exit(0);
    } else if (!a.startsWith('-')) {
      out.city = a;
    }
  }
  return out;
}

function printHelp() {
  console.log(`
用法: node build_roads.cjs [城市] [選項]

參數:
  [城市]            城市代碼（預設 macau）

選項:
  -i, --input       輸入 OSM JSON 檔（預設 public/data/<city>/osm_fr.json）
  -o, --output      輸出檔（預設 public/data/<city>/roads.json）
      --exclude-file 額外排除列表 JSON
      --no-merge    跳過相鄰路段合併
      --no-rdp      跳過 Douglas-Peucker 簡化
      --no-overrides 不套用手動修正
  -h, --help        顯示此說明
`);
}

function main() {
  const t0 = Date.now();
  console.log(`\n城市: ${city}`);
  console.log(`輸入: ${inputFile}`);

  if (!fs.existsSync(inputFile)) {
    console.error(`找不到輸入檔: ${inputFile}`);
    console.error('請先執行 pbf_to_json.cjs');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

  // ── 索引節點 ──
  const nodeCoords = new Map();
  for (const el of data.elements) {
    if (el.type === 'node' && typeof el.lat === 'number' && typeof el.lon === 'number') {
      nodeCoords.set(el.id, [el.lat, el.lon]);
    }
  }
  console.log(`  ✓ 節點索引: ${nodeCoords.size}`);

  // ── 過濾可接受的 way ──
  const acceptedWays = [];
  for (const el of data.elements) {
    if (el.type !== 'way') continue;
    if (!el.tags || !el.tags.highway) continue;
    if (!ACCEPTED_HIGHWAYS.has(el.tags.highway)) continue;
    if (!el.nodes || el.nodes.length < 2) continue;
    acceptedWays.push(el);
  }
  console.log(`  ✓ 候選 way: ${acceptedWays.length}`);

  // ── 排除列表 ──
  const excluder = loadExclusions({ cityDir, excludeFile: args.excludeFile });

  // ── 構建路口圖 ──
  const acceptedWayIds = new Set(acceptedWays.map(w => w.id));
  const graph = buildIntersectionGraph(data.elements, acceptedWayIds);
  console.log(`  ✓ 路口節點: ${graph.intersectionNodes.size}（≥ ${MIN_INTERSECTION_BRANCHES} 條 way 共享）`);
  console.log(`  ✓ 端點節點: ${graph.endpointNodes.size}`);

  // ── 處理每條 way ──
  const allSegments = [];
  let processedWays = 0;
  let skippedByName = 0;
  let skippedByCoords = 0;
  let osmTurnWays = 0;

  for (const way of acceptedWays) {
    const tags = way.tags || {};
    const name = resolveName(tags).primary;
    if (!name) {
      skippedByName++;
      continue;
    }
    if (shouldExclude(name, excluder)) {
      skippedByName++;
      continue;
    }

    // 預處理路徑（去重 + 簡化 + 切段）
    const segs = preprocessWay(
      way.nodes, nodeCoords,
      graph.intersectionNodes, graph.endpointNodes,
      tags.highway
    );
    if (segs.length === 0) {
      skippedByCoords++;
      continue;
    }

    // 解決車道數
    const counts = resolveLaneCounts(tags);

    // 解析 turn:lanes
    const turnForwardTag = tags['turn:lanes:forward'];
    const turnBackwardTag = tags['turn:lanes:backward'];
    const turnBothTag = tags['turn:lanes'];
    let hasOsmTurnData = false;
    let turnData = null;

    if (turnBothTag && !turnForwardTag && !turnBackwardTag) {
      hasOsmTurnData = true;
      turnData = parseTurnLanes(turnBothTag, counts.forward + counts.backward);
    } else if (turnForwardTag || turnBackwardTag) {
      hasOsmTurnData = true;
      turnData = {
        forward: turnForwardTag ? parseTurnLanes(turnForwardTag, counts.forward) : null,
        backward: turnBackwardTag ? parseTurnLanes(turnBackwardTag, counts.backward) : null,
      };
    }
    if (hasOsmTurnData) osmTurnWays++;

    // 為每段構建 Road
    processedWays++;
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i];

      // 車道分配
      let lf, lb;
      if (turnData) {
        if (turnData.forward || turnData.backward) {
          lf = turnData.forward || defaultStraightLanes(counts.forward);
          lb = turnData.backward || defaultStraightLanes(counts.backward);
        } else {
          // 雙向共用
          lf = turnData.slice(0, counts.forward);
          lb = turnData.slice(counts.forward);
        }
      } else {
        lf = defaultStraightLanes(counts.forward);
        lb = defaultStraightLanes(counts.backward);
      }

      // 環形交叉口：全部視為直走
      if (tags.junction === 'roundabout') {
        lf = lf.map(() => ({ icon: 'straight', label: '直走' }));
        lb = lb.map(() => ({ icon: 'straight', label: '直走' }));
      }

      const dest = [];
      if (tags['destination:lanes']) {
        dest.push(...tags['destination:lanes'].split('|').map(d => d.trim()).filter(Boolean));
      }

      // 用真實路口推斷（僅在無 OSM turn 數據時）
      let inferredLanes = false;
      if (!hasOsmTurnData) {
        // 推斷末端（forward 方向）
        if (lf.length > 0 && seg.path.length >= 2) {
          const endBranch = listBranchesAtEnd(graph, way, seg, nodeCoords);
          if (endBranch.length > 0) {
            const result = inferLanesForEndpoint({
              path: seg.path,
              direction: 'forward',
              myWayName: name,
              branches: endBranch,
              currentLanes: lf,
            });
            if (result.modified) {
              lf = result.lanes;
              inferredLanes = true;
            }
          }
        }
        // 推斷起點（backward 方向）
        if (lb.length > 0 && seg.path.length >= 2) {
          const startBranch = listBranchesAtStart(graph, way, seg, nodeCoords);
          if (startBranch.length > 0) {
            const result = inferLanesForEndpoint({
              path: [...seg.path].reverse(),
              direction: 'backward',
              myWayName: name,
              branches: startBranch,
              currentLanes: lb,
            });
            if (result.modified) {
              lb = result.lanes;
              inferredLanes = true;
            }
          }
        }
      }

      const r = buildRoad({
        id: `way_${way.id}_seg_${i}`,
        name,
        path: seg.path,
        tags,
        lanesForward: lf,
        lanesBackward: lb,
        destinations: dest,
        _hasOsmTurnData: hasOsmTurnData,
      });
      r._hadOsmTurn = hasOsmTurnData;
      r._inferred = inferredLanes;
      allSegments.push(r);
    }
  }

  console.log(`  ✓ 處理 ${processedWays} 條 way，跳過 ${skippedByName} (名稱) + ${skippedByCoords} (座標)`);
  console.log(`  ✓ 產生 ${allSegments.length} 個初始路段`);
  console.log(`  ✓ 帶 OSM turn:lanes 數據: ${osmTurnWays} 條 way`);

  // 微段合併（按 way 群組）
  const segsByWay = new Map();
  for (const seg of allSegments) {
    const wid = seg.id.split('_seg_')[0];
    if (!segsByWay.has(wid)) segsByWay.set(wid, []);
    segsByWay.get(wid).push(seg);
  }
  let mergedMicro = 0;
  for (const [, group] of segsByWay.entries()) {
    const before = group.length;
    const after = mergeMicroSegments(group, (s) => s.name);
    if (after.length < before) {
      // 把合併掉的從 allSegments 移除
      const toRemove = new Set(group.filter(s => !after.includes(s)));
      for (let i = allSegments.length - 1; i >= 0; i--) {
        if (toRemove.has(allSegments[i])) allSegments.splice(i, 1);
      }
      mergedMicro += before - after.length;
    }
  }
  console.log(`  ✓ 微段合併: 移除 ${mergedMicro} 個短段`);

  // 手動修正（在合併前）。--no-overrides 可關閉。
  const overrides = args.noOverrides
    ? []
    : loadOverrides(path.join(cityDir, 'lane_overrides.json'));
  if (overrides.length > 0) {
    const result = applyOverrides(allSegments, overrides);
    console.log(`  ✓ 手動修正: 套用 ${result.applied}/${overrides.length} 條`);
    for (const d of result.details) {
      if (d.status === 'applied') {
        console.log(`      · ${d.comment} → ${d.road} (${d.distance}m)`);
      } else if (d.status === 'too-far') {
        console.log(`      ⚠ ${d.comment} 距離太遠 (${d.distance}m)`);
      } else {
        console.log(`      ⚠ ${d.comment} 找不到匹配`);
      }
    }
  }

  // 排序（讓合併後的順序穩定）
  allSegments.sort((a, b) => {
    if (a.name !== b.name) return a.name.localeCompare(b.name, 'zh');
    return a.path[0][0] - b.path[0][0];
  });

  // 合併相鄰相容路段
  const beforeMerge = allSegments.length;
  const final = args.noMerge ? allSegments : mergeRoads(allSegments);
  console.log(`  ✓ 路段合併: ${beforeMerge} → ${final.length}（移除 ${beforeMerge - final.length} 條冗餘）`);

  // 清理內部欄位 + 重新編號
  const cleaned = finalize(final);

  // 統計 + 報告
  const stats = summarize(cleaned);
  console.log(formatReport(stats));

  // 寫入
  fs.writeFileSync(outputFile, JSON.stringify(cleaned, null, 2), 'utf8');
  const sizeMB = (fs.statSync(outputFile).size / 1024 / 1024).toFixed(2);
  console.log(`  ✓ 已輸出: ${outputFile} (${sizeMB} MB, ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

/**
 * 給定當前 way 與 segment，找出在 segment 末端（path 最後一點）相鄰的其他 way。
 */
function listBranchesAtEnd(graph, way, seg, nodeCoords) {
  // 末端節點 id
  const endPt = seg.path[seg.path.length - 1];
  const shared = findSharedNodeId(seg.path, endPt, nodeCoords, graph);
  if (shared === null) return [];

  const exitBearing = endpointBearing(seg.path);
  if (exitBearing === null) return [];

  const branches = [];
  for (const [otherId, otherNodes] of graph.wayById.entries()) {
    if (otherId === way.id) continue;
    if (otherNodes.length < 2) continue;
    let otherRole = null;
    if (otherNodes[0] === shared) otherRole = 'start';
    else if (otherNodes[otherNodes.length - 1] === shared) otherRole = 'end';
    if (!otherRole) continue;

    // 計算 other way 從 shared 點「離開」的方向
    let otherBearing;
    if (otherRole === 'start') {
      // way 從 shared 出發，第二節點 = otherNodes[1]
      const next = nodeCoords.get(otherNodes[1]);
      if (!next) continue;
      otherBearing = geo.bearing(endPt[0], endPt[1], next[0], next[1]);
    } else {
      // way 在 shared 結束，倒數第二節點 = otherNodes[-2]
      const prev = nodeCoords.get(otherNodes[otherNodes.length - 2]);
      if (!prev) continue;
      const approachBearing = geo.bearing(prev[0], prev[1], endPt[0], endPt[1]);
      otherBearing = (approachBearing + 180) % 360;
    }
    const diff = geo.angleDiff(exitBearing, otherBearing);
    if (Math.abs(diff) < 15) continue; // 同向忽略

    branches.push({
      wayId: otherId,
      angle: diff,
      otherName: way.tags?.name || '',
    });
  }
  return branches;
}

function listBranchesAtStart(graph, way, seg, nodeCoords) {
  const startPt = seg.path[0];
  const shared = findSharedNodeId(seg.path, startPt, nodeCoords, graph);
  if (shared === null) return [];

  const exitBearing = startBearing(seg.path);
  if (exitBearing === null) return [];

  const branches = [];
  for (const [otherId, otherNodes] of graph.wayById.entries()) {
    if (otherId === way.id) continue;
    if (otherNodes.length < 2) continue;
    let otherRole = null;
    if (otherNodes[0] === shared) otherRole = 'start';
    else if (otherNodes[otherNodes.length - 1] === shared) otherRole = 'end';
    if (!otherRole) continue;

    let otherBearing;
    if (otherRole === 'start') {
      const next = nodeCoords.get(otherNodes[1]);
      if (!next) continue;
      otherBearing = geo.bearing(startPt[0], startPt[1], next[0], next[1]);
    } else {
      const prev = nodeCoords.get(otherNodes[otherNodes.length - 2]);
      if (!prev) continue;
      const approachBearing = geo.bearing(prev[0], prev[1], startPt[0], startPt[1]);
      otherBearing = (approachBearing + 180) % 360;
    }
    const diff = geo.angleDiff(exitBearing, otherBearing);
    if (Math.abs(diff) < 15) continue;

    branches.push({ wayId: otherId, angle: diff, otherName: way.tags?.name || '' });
  }
  return branches;
}

/**
 * 給定路徑末端座標，找對應的 OSM node id。
 * 因為我們已做過 RDP 簡化，需要用容差匹配。
 */
function findSharedNodeId(path, point, nodeCoords, graph) {
  // 從 path 中找最接近的原始節點（簡化前）
  // 為避免 O(N)，直接從 nodeCoords 反查：以該座標為 key 找最近的
  // 實作：先看座標是否精確匹配
  for (const [nid, coord] of nodeCoords.entries()) {
    if (coord[0] === point[0] && coord[1] === point[1]) {
      return nid;
    }
  }
  // 否則用 1.5m 容差掃描路口節點
  for (const nid of graph.intersectionNodes) {
    const coord = nodeCoords.get(nid);
    if (!coord) continue;
    if (geo.haversine(point[0], point[1], coord[0], coord[1]) < 1.5) {
      return nid;
    }
  }
  for (const nid of graph.endpointNodes) {
    const coord = nodeCoords.get(nid);
    if (!coord) continue;
    if (geo.haversine(point[0], point[1], coord[0], coord[1]) < 1.5) {
      return nid;
    }
  }
  return null;
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error('\n✗ 失敗:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
}

module.exports = { main };
