'use strict';

/**
 * Road 构造与合并。
 *
 * 职责：
 *  1. 从 (tags, segments) 构建 Road 对象
 *  2. 计算车行道数（解析 oneway / lanes:forward / lanes:backward）
 *  3. 合并相邻兼容路段（同名 / 同 highway / 同 oneway / 同 lanes）
 *  4. 标记 / 清理内部字段（_hasOsmTurnData, _manualOverride, _segMeta）
 */

const { pointsClose, pathLength } = require('./geo.cjs');
const { ICON_LABELS } = require('./lane-parser.cjs');

/** 道路类型 → 預設車道數（單向） */
const DEFAULT_LANES = {
  motorway: 3, motorway_link: 1,
  trunk: 3, trunk_link: 1,
  primary: 2, primary_link: 1,
  secondary: 2, secondary_link: 1,
  tertiary: 1, tertiary_link: 1,
  residential: 1, unclassified: 1,
  living_street: 1, road: 1,
  service: 1,
};

/** 判斷 oneway（含 roundabouts） */
function isOneway(tags) {
  if (tags.junction === 'roundabout') return { oneway: true, reversed: false, roundabout: true };
  const ow = tags.oneway;
  if (ow === 'yes' || ow === 'true' || ow === '1') return { oneway: true, reversed: false, roundabout: false };
  if (ow === '-1' || ow === 'reverse') return { oneway: true, reversed: true, roundabout: false };
  return { oneway: false, reversed: false, roundabout: false };
}

/**
 * 解析車道數分配 (forward, backward)。
 * 邏輯：
 *  - 顯式 oneway → 單向
 *  - lanes:forward / lanes:backward 各自優先
 *  - 否則按 total 對半分（單數時 forward 多）
 *  - 完全沒給 → 用類型預設
 */
function resolveLaneCounts(tags) {
  const ow = isOneway(tags);
  const totalRaw = tags.lanes ? parseInt(tags.lanes, 10) : null;
  const total = totalRaw && totalRaw > 0 ? totalRaw : null;
  const fwdRaw = tags['lanes:forward'] ? parseInt(tags['lanes:forward'], 10) : null;
  const bwdRaw = tags['lanes:backward'] ? parseInt(tags['lanes:backward'], 10) : null;
  const fallback = DEFAULT_LANES[tags.highway] || 1;

  if (ow.oneway) {
    const count = total || (ow.reversed ? fallback : fallback);
    return { forward: ow.reversed ? 0 : count, backward: ow.reversed ? count : 0, oneway: true, reversed: ow.reversed };
  }

  // 雙向
  if (fwdRaw !== null && bwdRaw !== null) {
    return { forward: Math.max(0, fwdRaw), backward: Math.max(0, bwdRaw), oneway: false, reversed: false };
  }
  if (fwdRaw !== null) {
    const t = total || (fwdRaw + fallback);
    return { forward: fwdRaw, backward: Math.max(0, t - fwdRaw), oneway: false, reversed: false };
  }
  if (bwdRaw !== null) {
    const t = total || (bwdRaw + fallback);
    return { forward: Math.max(0, t - bwdRaw), backward: bwdRaw, oneway: false, reversed: false };
  }
  if (total !== null) {
    const f = Math.ceil(total / 2);
    const b = total - f;
    return { forward: f, backward: b, oneway: false, reversed: false };
  }
  return { forward: fallback, backward: fallback, oneway: false, reversed: false };
}

function defaultStraightLanes(count) {
  const arr = [];
  for (let i = 0; i < count; i++) {
    arr.push({ icon: 'straight', label: ICON_LABELS.straight });
  }
  return arr;
}

/**
 * 構造 Road 對象。
 * @param {object} args
 * @param {string} args.id
 * @param {string} args.name
 * @param {Array<[number,number]>} args.path
 * @param {object} args.tags
 * @param {Array} [args.lanesForward]
 * @param {Array} [args.lanesBackward]
 * @param {Array<string>} [args.destinations]
 * @param {boolean} [args._hasOsmTurnData]
 */
function buildRoad(args) {
  const { id, name, path, tags, lanesForward, lanesBackward, destinations, _hasOsmTurnData } = args;
  const ow = isOneway(tags);
  const r = {
    id,
    name,
    path,
    lanesForward: lanesForward || [],
    lanesBackward: lanesBackward || [],
    highway: tags.highway,
    oneway: ow.oneway,
    length: Math.round(pathLength(path) * 100) / 100,
  };
  if (destinations && destinations.length > 0) r.destinations = destinations;
  if (ow.roundabout) r.junction = 'roundabout';
  if (ow.reversed) r.reversed = true;
  if (tags.bridge === 'yes') r.bridge = true;
  if (tags.tunnel === 'yes') r.tunnel = true;
  if (tags.layer !== undefined && tags.layer !== '0') r.layer = parseInt(tags.layer, 10) || 0;
  if (tags.maxspeed) r.maxspeed = String(tags.maxspeed);
  if (tags.surface) r.surface = String(tags.surface);
  if (_hasOsmTurnData) r._hasOsmTurnData = true;
  return r;
}

/**
 * 判斷兩條 road 能否合併（同名 / 同 highway / 同 oneway / 同車道配置 / 路徑相接）。
 */
function canMergeRoads(a, b) {
  if (a._manualOverride || b._manualOverride) return false;
  if (a.name !== b.name) return false;
  if (a.highway !== b.highway) return false;
  if (a.oneway !== b.oneway) return false;
  if (Boolean(a.reversed) !== Boolean(b.reversed)) return false;
  if (a.junction || b.junction) return false;
  if (!sameLanes(a.lanesForward, b.lanesForward)) return false;
  if (!sameLanes(a.lanesBackward, b.lanesBackward)) return false;
  if (JSON.stringify(a.destinations || []) !== JSON.stringify(b.destinations || [])) return false;
  if (Boolean(a._hasOsmTurnData) !== Boolean(b._hasOsmTurnData)) return false;

  // 路徑相接：a 的終點 ≈ b 的起點（或反向）
  if (pointsClose(a.path[a.path.length - 1], b.path[0])) return 'forward';
  if (pointsClose(b.path[b.path.length - 1], a.path[0])) return 'reverse';
  return false;
}

function sameLanes(a, b) {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].icon !== b[i].icon || a[i].label !== b[i].label) return false;
  }
  return true;
}

/**
 * 合併相鄰路段。返回新陣列（原陣列不變）。
 */
function mergeRoads(roads) {
  if (roads.length === 0) return roads;
  const out = [roads[0]];
  for (let i = 1; i < roads.length; i++) {
    const prev = out[out.length - 1];
    const curr = roads[i];
    const direction = canMergeRoads(prev, curr);
    if (direction === 'forward') {
      prev.path = prev.path.concat(curr.path.slice(1));
      prev.length = Math.round(pathLength(prev.path) * 100) / 100;
    } else if (direction === 'reverse') {
      curr.path = curr.path.concat(prev.path.slice(1));
      curr.length = Math.round(pathLength(curr.path) * 100) / 100;
      out[out.length - 1] = curr;
    } else {
      out.push(curr);
    }
  }
  return out;
}

/**
 * 清理內部字段，並重新編號 id。
 */
function finalize(roads) {
  const cleaned = roads.map((r) => {
    const c = { ...r };
    delete c._hasOsmTurnData;
    delete c._manualOverride;
    return c;
  });
  cleaned.forEach((r, i) => { r.id = `road_${i + 1}`; });
  return cleaned;
}

module.exports = {
  DEFAULT_LANES,
  isOneway,
  resolveLaneCounts,
  defaultStraightLanes,
  buildRoad,
  canMergeRoads,
  mergeRoads,
  finalize,
};
