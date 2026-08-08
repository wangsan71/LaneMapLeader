'use strict';

/**
 * 地理工具：距離、方位角、角度差、RDP 簡化
 *
 * 座標系統：所有 path 點都是 [lat, lng]（與 OSM 一致）。
 * 與 MapLibre 不同（MapLibre 用 [lng, lat]），這是倉庫約定。
 */

const EARTH_RADIUS_M = 6371008.8;

const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;
const normalizeAngle = (deg) => ((deg % 360) + 360) % 360;

/**
 * 大圓距離（Haversine），單位米。
 * 在城市尺度上 ±0.5% 誤差，比 Euclidean 更穩。
 */
function haversine(lat1, lng1, lat2, lng2) {
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dPhi = toRad(lat2 - lat1);
  const dLambda = toRad(lng2 - lng1);
  const a =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * 初始方位角（從 p1 到 p2），度數，0=北，順時針。
 * 對於短距離（< 1 km）誤差可忽略。
 */
function bearing(lat1, lng1, lat2, lng2) {
  const dLon = toRad(lng2 - lng1);
  const y =
    Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return normalizeAngle(toDeg(Math.atan2(y, x)));
}

/**
 * 角度差（-180 ~ 180），正值表示 b2 在 b1 順時針方向。
 */
function angleDiff(b1, b2) {
  let diff = normalizeAngle(b2 - b1);
  if (diff > 180) diff -= 360;
  return diff;
}

/**
 * 累積路徑長度（米）。
 * 回傳長度等於 path.length 的陣列，第 i 項是從 path[0] 到 path[i] 的距離。
 */
function cumulativeDistances(path) {
  const out = new Float64Array(path.length);
  for (let i = 1; i < path.length; i++) {
    const d = haversine(
      path[i - 1][0], path[i - 1][1],
      path[i][0], path[i][1]
    );
    out[i] = out[i - 1] + d;
  }
  return out;
}

/**
 * 點到線段距離（米）。用於「給定 GPS，找最近路徑點」。
 *
 * 投影用經緯度的等距近似：
 * 將 (lat, lng) 在參考緯度上做等距投影 → (y, x)，然後用標準點-線段投影。
 * 對 < 5 km 的區段誤差 < 0.1%。
 */
function pointToSegmentDistance(pxLat, pxLng, aLat, aLng, bLat, bLng) {
  const refLat = (aLat + bLat) / 2;
  const cosRef = Math.cos(toRad(refLat));
  // 投影成 (x, y)，x = lng * cosRef，y = lat
  const ax = aLng * cosRef;
  const ay = aLat;
  const bx = bLng * cosRef;
  const by = bLat;
  const px = pxLng * cosRef;
  const py = pxLat;

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return haversine(pxLat, pxLng, aLat, aLng);
  }
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  // 投影回 (lat, lng)
  const projLat = projY;
  const projLng = projX / cosRef;
  return haversine(pxLat, pxLng, projLat, projLng);
}

/**
 * Douglas-Peucker 簡化。容差單位：米。
 *
 * 在 [lat, lng] 座標系下用等距投影計算距離（見 pointToSegmentDistance）。
 * 簡化後保留首尾點。
 *
 * @param {Array<[number, number]>} path
 * @param {number} toleranceMeters
 * @returns {Array<[number, number]>}
 */
function simplifyPath(path, toleranceMeters) {
  if (path.length < 3 || toleranceMeters <= 0) return path.slice();

  // 找距離首尾連線最遠的點
  const keep = new Uint8Array(path.length);
  keep[0] = 1;
  keep[path.length - 1] = 1;

  const stack = [[0, path.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop();
    if (end - start < 2) continue;
    let maxDist = 0;
    let maxIdx = -1;
    for (let i = start + 1; i < end; i++) {
      const d = pointToSegmentDistance(
        path[i][0], path[i][1],
        path[start][0], path[start][1],
        path[end][0], path[end][1]
      );
      if (d > maxDist) {
        maxDist = d;
        maxIdx = i;
      }
    }
    if (maxDist > toleranceMeters && maxIdx !== -1) {
      keep[maxIdx] = 1;
      stack.push([start, maxIdx]);
      stack.push([maxIdx, end]);
    }
  }

  const out = [];
  for (let i = 0; i < path.length; i++) {
    if (keep[i]) out.push(path[i]);
  }
  return out;
}

/**
 * 連續重複點去除（容差 0.5 m）。RDP 之前先呼叫以減少運算。
 */
function dedupeConsecutive(path, toleranceMeters = 0.5) {
  if (path.length < 2) return path.slice();
  const out = [path[0]];
  for (let i = 1; i < path.length; i++) {
    const last = out[out.length - 1];
    if (haversine(last[0], last[1], path[i][0], path[i][1]) > toleranceMeters) {
      out.push(path[i]);
    }
  }
  return out;
}

/**
 * 路徑總長度（米）。
 */
function pathLength(path) {
  if (path.length < 2) return 0;
  let len = 0;
  for (let i = 1; i < path.length; i++) {
    len += haversine(
      path[i - 1][0], path[i - 1][1],
      path[i][0], path[i][1]
    );
  }
  return len;
}

/**
 * 兩點是否足夠接近（用於「上一段的終點和下一段的起點」連接判斷）。
 */
function pointsClose(a, b, toleranceMeters = 1.5) {
  return haversine(a[0], a[1], b[0], b[1]) <= toleranceMeters;
}

module.exports = {
  EARTH_RADIUS_M,
  toRad,
  toDeg,
  normalizeAngle,
  haversine,
  bearing,
  angleDiff,
  cumulativeDistances,
  pointToSegmentDistance,
  simplifyPath,
  dedupeConsecutive,
  pathLength,
  pointsClose,
};
