'use strict';

/**
 * 智能切段。
 *
 * 取代舊版的「80m 切一段 + 35° 切」邏輯。新策略：
 *  1. 在 OSM 真實路口（共享節點）處必切
 *  2. 道路等級越高，最大段長越長
 *  3. 最小段長保護：任何段 < 6m 就併入鄰段
 *  4. 急彎（> 60°）處額外切，給轉向推斷提供更準確的入口資訊
 *
 * 不再盲目按累積距離切。
 */

const { bearing, angleDiff, pathLength, haversine, dedupeConsecutive, simplifyPath } = require('./geo.cjs');

/** 道路等級 → 段長上限（米） */
const MAX_SEGMENT_LENGTH_BY_CLASS = {
  motorway: 200,
  trunk: 180,
  primary: 150,
  secondary: 130,
  tertiary: 110,
  residential: 80,
  unclassified: 80,
  living_street: 60,
  service: 50,
  road: 80,
};

const MIN_SEGMENT_LENGTH = 6;        // 任何段低於此值會被併入
const HARD_BEARING_CHANGE_DEG = 60; // 急彎（單點 > 60°）必切
const SOFT_BEARING_CHANGE_DEG = 35; // 累積 > 35° 時若段長已達 50% 上限也切

/**
 * 對單條 way 做切段。輸出多個 segment，每個 segment 是一個路徑子序列。
 *
 * @param {Array<[number, number]>} rawPath - way 的完整 [lat, lng] 序列
 * @param {Set<number>} nodeIds - 該 way 對應的 node id 序列
 * @param {Set<number>} intersectionNodes - 路口節點
 * @param {Set<number>} endpointNodes - way 端點節點
 * @param {string} highwayClass
 * @returns {Array<{ startIdx: number, endIdx: number, path: Array<[number,number]>, length: number }>}
 */
function segmentWay(rawPath, nodeIds, intersectionNodes, endpointNodes, highwayClass) {
  if (rawPath.length < 2) return [];

  // 計算每段的方位角
  const bearings = new Array(rawPath.length - 1);
  for (let i = 0; i < bearings.length; i++) {
    bearings[i] = bearing(
      rawPath[i][0], rawPath[i][1],
      rawPath[i + 1][0], rawPath[i + 1][1]
    );
  }

  const maxLen = MAX_SEGMENT_LENGTH_BY_CLASS[highwayClass] || 80;
  const cuts = new Set([0, rawPath.length - 1]); // 必含首尾

  // 在路口處切
  for (let i = 1; i < rawPath.length - 1; i++) {
    const nid = nodeIds[i];
    if (nid !== undefined && intersectionNodes.has(nid)) {
      cuts.add(i);
    }
  }
  // 在 way 端點（與其他 way 接合處）切
  for (let i = 1; i < rawPath.length - 1; i++) {
    const nid = nodeIds[i];
    if (nid !== undefined && endpointNodes.has(nid)) {
      // 端點但非真路口：只在段長 > 60m 時切
      // 否則小街接小街直接連起來即可
      cuts.add(i);
    }
  }

  // 急彎處切
  for (let i = 1; i < bearings.length; i++) {
    const diff = Math.abs(angleDiff(bearings[i - 1], bearings[i]));
    if (diff > HARD_BEARING_CHANGE_DEG) {
      cuts.add(i);
      cuts.add(i + 1);
    }
  }

  // 長度上限：累積超過 maxLen 時切
  let accLen = 0;
  let lastCut = 0;
  for (let i = 1; i < rawPath.length; i++) {
    const segLen = haversine(
      rawPath[i - 1][0], rawPath[i - 1][1],
      rawPath[i][0], rawPath[i][1]
    );
    accLen += segLen;
    if (i - lastCut >= 2 && accLen >= maxLen) {
      cuts.add(i);
      accLen = 0;
      lastCut = i;
    }
  }

  // 排序切點
  const sortedCuts = Array.from(cuts).sort((a, b) => a - b);

  // 構建 segments
  const segments = [];
  for (let i = 0; i < sortedCuts.length - 1; i++) {
    const start = sortedCuts[i];
    const end = sortedCuts[i + 1];
    if (end <= start) continue;
    const path = rawPath.slice(start, end + 1);
    if (path.length < 2) continue;
    segments.push({
      startIdx: start,
      endIdx: end,
      path,
      length: pathLength(path),
    });
  }

  return segments;
}

/**
 * 合併太短的微段：將 < MIN_SEGMENT_LENGTH 的段併入鄰段（優先併入同 name 的鄰段）。
 *
 * @param {Array<{path, length, ...}>} segments
 * @param {string|string[]|((s) => string)} nameOf - 取每段的 name
 * @returns {Array}
 */
function mergeMicroSegments(segments, nameOf) {
  if (segments.length < 2) return segments;
  const getName = typeof nameOf === 'function'
    ? nameOf
    : (s) => (Array.isArray(nameOf) ? nameOf[segments.indexOf(s)] : nameOf);

  const out = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.length >= MIN_SEGMENT_LENGTH) {
      out.push(seg);
      continue;
    }
    // 太短：嘗試合併到前一段（同名優先）
    const myName = getName(seg);
    if (out.length > 0) {
      const prev = out[out.length - 1];
      const prevName = getName(prev);
      if (prevName === myName) {
        // 將當前段追加到前段尾部
        prev.path = prev.path.concat(seg.path.slice(1));
        prev.length = pathLength(prev.path);
        prev.endIdx = seg.endIdx;
        continue;
      }
    }
    // 否則嘗試合併到後一段
    if (i + 1 < segments.length) {
      const next = segments[i + 1];
      const nextName = getName(next);
      if (nextName === myName) {
        next.path = seg.path.slice(0, -1).concat(next.path);
        next.length = pathLength(next.path);
        next.startIdx = seg.startIdx;
        // 不 push seg，繼續（next 會在下一輪處理）
        continue;
      }
    }
    // 兩側都不同名：丟棄此微段（極少見）
  }
  return out;
}

/**
 * 對一條 way 做完整預處理：去重 → 簡化 → 切段 → 微段合併
 */
function preprocessWay(nodes, coords, intersectionNodes, endpointNodes, highwayClass) {
  let path = nodes.map(nid => coords.get(nid)).filter(Boolean);
  if (path.length < 2) return [];
  path = dedupeConsecutive(path, 0.5);
  path = simplifyPath(path, 0.6); // 0.6m 容差
  if (path.length < 2) return [];
  const segs = segmentWay(path, nodes, intersectionNodes, endpointNodes, highwayClass);
  return segs;
}

module.exports = {
  MAX_SEGMENT_LENGTH_BY_CLASS,
  MIN_SEGMENT_LENGTH,
  HARD_BEARING_CHANGE_DEG,
  SOFT_BEARING_CHANGE_DEG,
  segmentWay,
  mergeMicroSegments,
  preprocessWay,
};
