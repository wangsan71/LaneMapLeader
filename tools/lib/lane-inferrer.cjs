'use strict';

/**
 * 車道方向推斷引擎。
 *
 * 取代舊版「25m 半徑 + 25° 閾值」的粗略算法。新算法：
 *  1. 利用 intersection graph 找「真實路口」（共享節點 ≥ 3）
 *  2. 在每個路口端點，用「同一節點的相鄰 way 集合」做角度分類
 *  3. 根據分類結果（straight/left/right/uturn）給最左/最右車道打標
 *  4. 中間車道保持 straight
 *
 * 對中間車道的處理更細緻：
 *  - 4 車道：左 1 = straight_left，左 2 = left，右 2 = right，右 1 = straight_right
 *  - 3 車道：左 = straight_left，右 = straight_right
 *  - 2 車道：左 = straight_left（如有左出口），右 = straight_right（如有右出口）
 *  - 1 車道：根據最強烈方向
 */

const { bearing, angleDiff, pointsClose } = require('./geo.cjs');
const { ICON_LABELS } = require('./lane-parser.cjs');

const ANGLE_LEFT_DEG = -25;
const ANGLE_RIGHT_DEG = 25;
const ANGLE_UTURN_DEG = 160; // |angle| > 160 視為迴轉
const NEAR_FORWARD_DEG = 10; // 與當前方向 < 10° 視為同路延續

/**
 * 推斷單一端點的車道方向。
 *
 * @param {object} ctx
 * @param {Array<[number, number]>} ctx.path - 當前段路徑（[lat, lng]）
 * @param {('forward'|'backward')} ctx.direction - 是推斷前進方向還是反向
 * @param {string} ctx.myWayName - 當前段所屬 way 的名稱
 * @param {Array<{ wayId: number, role: 'start'|'end', angle: number }>} ctx.branches
 *        - 在當前端點的其他 way 角度（已在 intersection-graph 中計算）
 * @param {Array<{ icon: string, label: string }>} ctx.currentLanes - 當前車道配置
 * @returns {{ modified: boolean, lanes: Array<{icon: string, label: string}>, debug: object }}
 */
function inferLanesForEndpoint(ctx) {
  const { path, direction, myWayName, branches, currentLanes } = ctx;
  if (!currentLanes || currentLanes.length === 0) {
    return { modified: false, lanes: currentLanes || [], debug: { reason: 'no-lanes' } };
  }
  if (branches.length === 0) {
    return { modified: false, lanes: currentLanes, debug: { reason: 'no-branches' } };
  }

  // 過濾「同路延續」：同名 + 小角度（< 30°）算作當前路的自然延續，不算出口選項
  const meaningful = branches.filter(b => {
    if (b.otherName && b.otherName === myWayName && Math.abs(b.angle) < 30) return false;
    return true;
  });
  if (meaningful.length === 0) {
    return { modified: false, lanes: currentLanes, debug: { reason: 'all-same-road' } };
  }

  const hasLeft = meaningful.some(b => b.angle <= ANGLE_LEFT_DEG && b.angle > -180);
  const hasRight = meaningful.some(b => b.angle >= ANGLE_RIGHT_DEG && b.angle < 180);
  const hasUTurn = meaningful.some(b => Math.abs(b.angle) > ANGLE_UTURN_DEG);
  // 直行出口：在 ±ANGLE_LEFT_DEG 到 ±ANGLE_RIGHT_DEG 範圍內的不同 way
  const hasStraight = meaningful.some(b => b.angle > ANGLE_LEFT_DEG && b.angle < ANGLE_RIGHT_DEG);

  // 完全沒有轉彎出口 → 保持現狀
  if (!hasLeft && !hasRight && !hasUTurn) {
    return { modified: false, lanes: currentLanes, debug: { reason: 'no-turn-exits' } };
  }

  const n = currentLanes.length;
  const newLanes = currentLanes.map(l => ({ icon: l.icon, label: l.label }));
  let modified = false;

  // ── 處理迴轉（最罕見的，但有些環形交叉口出口會有）──
  if (hasUTurn && n === 1) {
    newLanes[0] = { icon: 'u_turn', label: ICON_LABELS.u_turn };
    return { modified: true, lanes: newLanes, debug: { hasUTurn, hasLeft, hasRight } };
  }

  // ── 多車道分配規則 ──
  if (n >= 4) {
    // 4+ 車道：左 2 道 + 右 2 道
    if (hasLeft) {
      newLanes[0] = hasStraight
        ? { icon: 'straight_left', label: ICON_LABELS.straight_left }
        : { icon: 'left', label: ICON_LABELS.left };
      if (hasStraight) {
        newLanes[1] = { icon: 'straight_left', label: ICON_LABELS.straight_left };
      } else {
        newLanes[1] = { icon: 'left', label: ICON_LABELS.left };
      }
      modified = true;
    }
    if (hasRight) {
      const last = n - 1;
      newLanes[last] = hasStraight
        ? { icon: 'straight_right', label: ICON_LABELS.straight_right }
        : { icon: 'right', label: ICON_LABELS.right };
      newLanes[last - 1] = hasStraight
        ? { icon: 'straight_right', label: ICON_LABELS.straight_right }
        : { icon: 'right', label: ICON_LABELS.right };
      modified = true;
    }
  } else if (n === 3) {
    if (hasLeft) {
      newLanes[0] = hasStraight
        ? { icon: 'straight_left', label: ICON_LABELS.straight_left }
        : { icon: 'left', label: ICON_LABELS.left };
      modified = true;
    }
    if (hasRight) {
      newLanes[2] = hasStraight
        ? { icon: 'straight_right', label: ICON_LABELS.straight_right }
        : { icon: 'right', label: ICON_LABELS.right };
      modified = true;
    }
  } else if (n === 2) {
    if (hasLeft && hasRight) {
      newLanes[0] = { icon: 'straight_left', label: ICON_LABELS.straight_left };
      newLanes[1] = { icon: 'straight_right', label: ICON_LABELS.straight_right };
      modified = true;
    } else if (hasLeft) {
      newLanes[0] = hasStraight
        ? { icon: 'straight_left', label: ICON_LABELS.straight_left }
        : { icon: 'left', label: ICON_LABELS.left };
      modified = true;
    } else if (hasRight) {
      newLanes[1] = hasStraight
        ? { icon: 'straight_right', label: ICON_LABELS.straight_right }
        : { icon: 'right', label: ICON_LABELS.right };
      modified = true;
    }
  } else {
    // n === 1
    if (hasLeft && hasRight) {
      newLanes[0] = { icon: 'left_right', label: ICON_LABELS.left_right };
      modified = true;
    } else if (hasLeft && !hasStraight) {
      newLanes[0] = { icon: 'left', label: ICON_LABELS.left };
      modified = true;
    } else if (hasRight && !hasStraight) {
      newLanes[0] = { icon: 'right', label: ICON_LABELS.right };
      modified = true;
    } else if (hasLeft) {
      newLanes[0] = { icon: 'straight_left', label: ICON_LABELS.straight_left };
      modified = true;
    } else if (hasRight) {
      newLanes[0] = { icon: 'straight_right', label: ICON_LABELS.straight_right };
      modified = true;
    }
  }

  return {
    modified,
    lanes: modified ? newLanes : currentLanes,
    debug: { hasLeft, hasRight, hasStraight, hasUTurn, n, direction },
  };
}

/**
 * 計算 path 末端的方位角（從倒數第二點 → 最後一點）。
 */
function endpointBearing(path) {
  if (path.length < 2) return null;
  const a = path[path.length - 2];
  const b = path[path.length - 1];
  return bearing(a[0], a[1], b[0], b[1]);
}

/**
 * 計算 path 起點的方位角（從第 0 點 → 第 1 點），用於 backward 推斷。
 */
function startBearing(path) {
  if (path.length < 2) return null;
  return bearing(path[0][0], path[0][1], path[1][0], path[1][1]);
}

module.exports = {
  inferLanesForEndpoint,
  endpointBearing,
  startBearing,
  ANGLE_LEFT_DEG,
  ANGLE_RIGHT_DEG,
  ANGLE_UTURN_DEG,
};
