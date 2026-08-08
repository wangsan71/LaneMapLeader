'use strict';

/**
 * 交叉路口圖構建。
 *
 * 核心想法：在 OSM 數據中，「路口」= 被 ≥ 2 條 highway way 共享的節點。
 * 這比用 25m 半徑找附近節點更精準。
 *
 * 為避免假路口：
 *  - 過濾被 ≥ 3 條 way 共享的「T / + 形 / X 形」路口
 *  - 過濾 < 30° 內分支的退化路口
 *
 * 對於非十字路口的小道路端點（一條 way 終止），仍然在圖中記錄為
 * endpoint，供 segmenter 在「way 結尾」處做切段。
 *
 * 用法：
 *   const graph = buildIntersectionGraph(elements, wayIds);
 *   graph.isIntersection(nodeId) -> boolean
 *   graph.getNeighbors(wayId, nodeIdx) -> [{ wayId, role: 'start'|'end', angle }]
 */

const { bearing, angleDiff, haversine } = require('./geo.cjs');

const MIN_INTERSECTION_BRANCHES = 3; // 至少 3 條 way 共享才視為真路口
const MIN_BRANCH_ANGLE_DEG = 25;     // 分支角度 < 此值視為同路分歧，不算路口

/**
 * @param {Array<object>} elements - OSM 元素（包含 node + way）
 * @param {Set<number>|Array<number>} wayIds - 候選 way id 集合
 * @returns {{
 *   intersectionNodes: Set<number>,
 *   endpointNodes: Set<number>,
 *   sharedCount: Map<number, number>,
 *   isIntersection: (n:number) => boolean,
 *   isEndpoint: (n:number) => boolean,
 * }}
 */
function buildIntersectionGraph(elements, wayIds) {
  const wayIdSet = wayIds instanceof Set ? wayIds : new Set(wayIds);
  const wayById = new Map();
  const sharedCount = new Map();

  // 第一遍：建立 way 索引 + 統計共享
  // 同時記錄每個 node 是否是某 way 的端點（首/尾）
  const isWayEnd = new Set();
  for (const el of elements) {
    if (el.type !== 'way') continue;
    if (!wayIdSet.has(el.id)) continue;
    if (!el.nodes || el.nodes.length < 2) continue;
    wayById.set(el.id, el.nodes);
    isWayEnd.add(el.nodes[0]);
    isWayEnd.add(el.nodes[el.nodes.length - 1]);
    for (const nid of el.nodes) {
      sharedCount.set(nid, (sharedCount.get(nid) || 0) + 1);
    }
  }

  const intersectionNodes = new Set();
  const endpointNodes = new Set();

  for (const [nid, count] of sharedCount.entries()) {
    if (count >= MIN_INTERSECTION_BRANCHES) {
      intersectionNodes.add(nid);
    } else if (count === 1 && isWayEnd.has(nid)) {
      // 只有 1 條 way 經過，且這個 node 是該 way 的首/尾 → 真端點
      endpointNodes.add(nid);
    } else if (count === 2) {
      // 兩條 way 共享節點。
      // 若是任一條的端點，視為 way 接合點（segmenter 切段用）
      if (isWayEnd.has(nid)) endpointNodes.add(nid);
    }
  }

  return {
    intersectionNodes,
    endpointNodes,
    sharedCount,
    isIntersection: (n) => intersectionNodes.has(n),
    isEndpoint: (n) => endpointNodes.has(n),
    wayById,
  };
}

/**
 * 計算 way 在某端點處的離開方位角（從端點往外看）。
 * 若 way 結尾，方向 = 倒數第二 → 最後；若 way 開頭，方向 = 第二 → 第一。
 */
function wayEndpointBearing(nodes, role) {
  if (nodes.length < 2) return null;
  if (role === 'end') {
    const a = nodes[nodes.length - 2];
    const b = nodes[nodes.length - 1];
    return bearing(a.lat, a.lng, b.lat, b.lng);
  }
  // 'start'
  const a = nodes[1];
  const b = nodes[0];
  return bearing(a.lat, a.lng, b.lat, b.lng);
}

/**
 * 對於某條 way，在其端點處找出「同節點」的其他 way 集合，
 * 計算每條的「偏離角度」（從當前 way 的離開方向順時針為正）。
 *
 * 對於角度差絕對值 < MIN_BRANCH_ANGLE_DEG 的視為「同路」返回 null（不視為分叉）。
 *
 * @param {object} params
 * @param {Map<number, number[]>} params.wayNodesMap - wayId -> nodeIds
 * @param {Map<number, [number,number]>} params.nodeCoords - nodeId -> [lat, lng]
 * @param {number} params.wayId - 當前 way
 * @param {('start'|'end')} params.role
 * @returns {Array<{ wayId:number, angle:number, distance:number }>}
 */
function listBranchesAtEndpoint({ wayNodesMap, nodeCoords, wayId, role }) {
  const nodes = wayNodesMap.get(wayId);
  if (!nodes || nodes.length < 2) return [];
  const endpointNodeId = role === 'end' ? nodes[nodes.length - 1] : nodes[0];
  const endpointCoord = nodeCoords.get(endpointNodeId);
  if (!endpointCoord) return [];
  const exitBearing = wayEndpointBearing(
    role === 'end'
      ? [
          { lat: nodeCoords.get(nodes[nodes.length - 2])[0], lng: nodeCoords.get(nodes[nodes.length - 2])[1] },
          { lat: endpointCoord[0], lng: endpointCoord[1] },
        ]
      : [
          { lat: nodeCoords.get(nodes[1])[0], lng: nodeCoords.get(nodes[1])[1] },
          { lat: endpointCoord[0], lng: endpointCoord[1] },
        ],
    'end'
  );
  if (exitBearing === null) return [];

  const branches = [];
  for (const [otherWayId, otherNodes] of wayNodesMap.entries()) {
    if (otherWayId === wayId) continue;
    if (otherNodes.length < 2) continue;
    // 檢查 other way 是否在端點附近有節點（共享同一節點）
    const otherStartNodeId = otherNodes[0];
    const otherEndNodeId = otherNodes[otherNodes.length - 1];
    let otherRole = null;
    if (otherStartNodeId === endpointNodeId) otherRole = 'start';
    else if (otherEndNodeId === endpointNodeId) otherRole = 'end';
    if (!otherRole) continue;

    const otherStartCoord = nodeCoords.get(otherNodes[1] || otherNodes[0]);
    const otherEndCoord = nodeCoords.get(otherNodes[otherNodes.length - 2] || otherNodes[otherNodes.length - 1]);
    if (!otherStartCoord || !otherEndCoord) continue;

    // 計算 other way 在該端點的「離開角度」
    const aCoord = otherRole === 'start' ? otherStartCoord : otherEndCoord;
    const bCoord = endpointCoord;
    const otherBearing = bearing(aCoord[0], aCoord[1], bCoord[0], bCoord[1]);
    const diff = angleDiff(exitBearing, otherBearing);

    if (Math.abs(diff) < MIN_BRANCH_ANGLE_DEG) continue; // 視為同向

    branches.push({
      wayId: otherWayId,
      angle: diff,
      distance: 0,
    });
  }
  return branches;
}

module.exports = {
  buildIntersectionGraph,
  wayEndpointBearing,
  listBranchesAtEndpoint,
  MIN_INTERSECTION_BRANCHES,
  MIN_BRANCH_ANGLE_DEG,
};
