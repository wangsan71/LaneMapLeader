'use strict';

/**
 * OSM turn:lanes 解析。
 *
 * 文法（OSM 標準）：
 *   value   := lane ('|' lane)*
 *   lane    := turn (';' turn)*
 *   turn    := modifier | 'merge_to_left' | 'merge_to_right' | 'reverse' | 'none' | 'through'
 *
 * modifier: left, right, slight_left, slight_right, sharp_left, sharp_right, straight, uturn
 *
 * 輸出：每條車道對應到前端 LaneIcon 鍵：
 *   left, right, straight, slight_left, slight_right,
 *   straight_left, straight_right, left_right, straight_left_right,
 *   u_turn, uturn_left, uturn_right,
 *   merge_left, merge_right
 *
 * 標籤統一用繁體中文（與 app 當前 zh-Hant 預設語言一致）。
 */

const ICON_LABELS = {
  straight: '直走',
  left: '左轉',
  right: '右轉',
  slight_left: '左前方',
  slight_right: '右前方',
  straight_left: '直走 / 左轉',
  straight_right: '直走 / 右轉',
  left_right: '左轉 / 右轉',
  straight_left_right: '直走 / 左轉 / 右轉',
  u_turn: '迴轉',
  uturn_left: '迴轉 / 左轉',
  uturn_right: '迴轉 / 右轉',
  merge_left: '靠左',
  merge_right: '靠右',
};

const TURN_ALIASES = {
  // OSM 規範的 modifier
  left: 'left',
  right: 'right',
  'slight left': 'slight_left',
  'slight_right': 'slight_right',
  'sharp left': 'left',     // sharp 視覺等同普通
  'sharp right': 'right',
  straight: 'straight',
  through: 'straight',       // through = 直走
  reverse: 'u_turn',
  uturn: 'u_turn',
  none: 'straight',          // none = 不允許變道/不指示 = 視作直走
  merge_to_left: 'merge_left',
  merge_to_right: 'merge_right',
};

/**
 * 將 OSM turn token 正規化為內部 modifier 名。
 * 支援多種常見變體（空格、底線、大小寫）。
 */
function normalizeTurnToken(t) {
  if (!t) return null;
  const s = String(t).toLowerCase().trim().replace(/-/g, '_');
  if (TURN_ALIASES[s]) return TURN_ALIASES[s];
  // 容錯：'sharp left' / 'slight left' 帶空格
  const withSpace = s.replace(/_/g, ' ');
  if (TURN_ALIASES[withSpace]) return TURN_ALIASES[withSpace];
  return null;
}

/**
 * 單一車道（可能包含多個 turn，用 ; 分隔）→ LaneIcon 鍵。
 * 自動正規化 OSM token（"through" / "left" / "sharp left" 等）。
 * 規則：
 *  - 0 / 空 → straight
 *  - 1 個 → 該 turn
 *  - 多個：根據組合映射
 *    - left + through + right → straight_left_right
 *    - straight + left         → straight_left
 *    - straight + right        → straight_right
 *    - left + right            → left_right
 *    - uturn + left            → uturn_left
 *    - uturn + right           → uturn_right
 *  - 其他 → 取最強烈的那個（uturn > sharp > 標準 > slight）
 */
function combineTurns(turns) {
  // 先正規化所有 token
  const normalized = turns
    .map(normalizeTurnToken)
    .filter(Boolean);
  if (normalized.length === 0) return { icon: 'straight', label: ICON_LABELS.straight };

  if (normalized.length === 1) {
    const icon = normalized[0];
    return { icon, label: ICON_LABELS[icon] || ICON_LABELS.straight };
  }

  const set = new Set(normalized);
  const has = (k) => set.has(k);

  if (has('straight') && has('left') && has('right')) {
    return { icon: 'straight_left_right', label: ICON_LABELS.straight_left_right };
  }
  if (has('u_turn') && has('left')) {
    return { icon: 'uturn_left', label: ICON_LABELS.uturn_left };
  }
  if (has('u_turn') && has('right')) {
    return { icon: 'uturn_right', label: ICON_LABELS.uturn_right };
  }
  if (has('u_turn') && has('straight')) {
    return { icon: 'straight_left_right', label: ICON_LABELS.straight_left_right };
  }
  if (has('u_turn')) {
    return { icon: 'u_turn', label: ICON_LABELS.u_turn };
  }
  if (has('straight') && has('left')) {
    return { icon: 'straight_left', label: ICON_LABELS.straight_left };
  }
  if (has('straight') && has('right')) {
    return { icon: 'straight_right', label: ICON_LABELS.straight_right };
  }
  if (has('left') && has('right')) {
    return { icon: 'left_right', label: ICON_LABELS.left_right };
  }
  if (has('slight_left') && has('left')) {
    return { icon: 'left', label: ICON_LABELS.left };
  }
  if (has('slight_right') && has('right')) {
    return { icon: 'right', label: ICON_LABELS.right };
  }
  // 兩個都是 merge：取左/右的版本
  if (has('merge_left') && has('merge_right')) {
    return { icon: 'merge_left', label: ICON_LABELS.merge_left };
  }
  if (has('merge_left') && has('straight')) {
    return { icon: 'slight_left', label: ICON_LABELS.slight_left };
  }
  if (has('merge_right') && has('straight')) {
    return { icon: 'slight_right', label: ICON_LABELS.slight_right };
  }
  // fallback：依優先級
  const priority = ['u_turn', 'left', 'right', 'slight_left', 'slight_right', 'straight', 'merge_left', 'merge_right'];
  for (const p of priority) {
    if (has(p)) return { icon: p, label: ICON_LABELS[p] || ICON_LABELS.straight };
  }
  return { icon: 'straight', label: ICON_LABELS.straight };
}

/**
 * 解析整個 turn:lanes 字串。回傳長度為 laneCount 的陣列。
 * 若 OSM 資料少於或多於 laneCount，多餘的填直走，缺少的重複最後一條。
 *
 * @param {string} value
 * @param {number} [laneCount] 期望車道數（用於補齊）
 * @returns {Array<{icon: string, label: string}>}
 */
function parseTurnLanes(value, laneCount) {
  if (!value || typeof value !== 'string') return null;
  const lanes = value.split('|').map(part => {
    const turns = part.split(';')
      .map(normalizeTurnToken)
      .filter(Boolean);
    return combineTurns(turns);
  });

  if (typeof laneCount === 'number' && laneCount > 0) {
    while (lanes.length < laneCount) {
      lanes.push(lanes[lanes.length - 1] || { icon: 'straight', label: ICON_LABELS.straight });
    }
    if (lanes.length > laneCount) {
      lanes.length = laneCount;
    }
  }
  return lanes;
}

module.exports = {
  ICON_LABELS,
  normalizeTurnToken,
  combineTurns,
  parseTurnLanes,
};
