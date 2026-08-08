'use strict';

/**
 * 手动修正应用。
 *
 * 数据格式（与旧版兼容）：
 *   [
 *     {
 *       lat, lng,             // 匹配坐标
 *       comment?,             // 备注
 *       lanesForward?,        // 可选
 *       lanesBackward?,       // 可选
 *       name?                 // 可选
 *     }
 *   ]
 *
 * 匹配算法：
 *  1. 遍历每条 override
 *  2. 对每条 road，找路径上离 override 最近的点
 *  3. 全局最近的 road 胜出
 *  4. 距离 <= MAX_MATCH_DISTANCE_M 的应用；否则警告
 *
 * 应用后给 road 标 _manualOverride=true，阻止后续 merger 合并它。
 */

const fs = require('fs');
const { haversine, pointToSegmentDistance } = require('./geo.cjs');

const MAX_MATCH_DISTANCE_M = 250;

function loadOverrides(filePath) {
  if (!fs.existsSync(filePath)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

/**
 * @param {Array} roads - 已构建的 Road 数组（path 是 [lat, lng][]）
 * @param {Array} overrides
 * @returns {{ applied: number, skipped: number, details: Array }}
 */
function applyOverrides(roads, overrides) {
  let applied = 0;
  let skipped = 0;
  const details = [];

  for (const ov of overrides) {
    if (typeof ov.lat !== 'number' || typeof ov.lng !== 'number') {
      skipped++;
      continue;
    }
    let bestRoad = null;
    let bestDist = Infinity;
    for (const road of roads) {
      const path = road.path;
      // 先用节点快速筛选（点-点距离），再精算点-段距离
      for (let i = 0; i < path.length; i++) {
        const d = haversine(ov.lat, ov.lng, path[i][0], path[i][1]);
        if (d < bestDist) {
          bestDist = d;
          bestRoad = road;
        }
      }
    }

    if (bestRoad && bestDist <= MAX_MATCH_DISTANCE_M) {
      bestRoad._manualOverride = true;
      if (Array.isArray(ov.lanesForward) && ov.lanesForward.length > 0) {
        bestRoad.lanesForward = ov.lanesForward.map(l => ({ ...l }));
      }
      if (Array.isArray(ov.lanesBackward) && ov.lanesBackward.length > 0) {
        bestRoad.lanesBackward = ov.lanesBackward.map(l => ({ ...l }));
      }
      applied++;
      details.push({
        comment: ov.comment || ov.name || '(unnamed)',
        road: bestRoad.name,
        distance: Math.round(bestDist),
        status: 'applied',
      });
    } else if (bestRoad) {
      skipped++;
      details.push({
        comment: ov.comment || ov.name || '(unnamed)',
        distance: Math.round(bestDist),
        status: 'too-far',
      });
    } else {
      skipped++;
      details.push({
        comment: ov.comment || ov.name || '(unnamed)',
        status: 'no-match',
      });
    }
  }

  return { applied, skipped, details };
}

module.exports = {
  loadOverrides,
  applyOverrides,
  MAX_MATCH_DISTANCE_M,
};
