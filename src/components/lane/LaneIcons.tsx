import React from 'react';

/**
 * 澳門道路交通標誌標線設置指引 2025.02.27
 * 附錄 A — 交辦標誌式樣：應遵標誌
 *
 * 對應圖片：
 * 201 應遵方向：向左
 * 202 應遵方向：向右
 * 203 應遵方向：左轉
 * 204 應遵方向：右轉
 * 205 應遵方向：直行
 * 206 可選擇之應遵方向：左或右
 * 207 可選擇之應遵方向：左或直行
 * 208 可選擇之應遵方向：直行或右
 * 209 必須繞過安全島或障礙物：左下
 * 210 必須繞過安全島或障礙物：右下
 * 211 必須繞過安全島或障礙物：左右分流
 * 212 環形應遵方向
 * 213 公共運輸車輛專用車道
 * 214 電單車專用車道
 */

const blue = '#1E40AF';
const white = '#FFFFFF';

const ring = `
  <circle cx="50" cy="50" r="47" fill="${blue}" stroke="${white}" stroke-width="2"/>
`;

/**
 * 基本箭頭比例
 * 圖片中的箭頭屬於粗箭身、寬箭頭風格。
 */
const SHAFT = 12;
const HALF_SHAFT = SHAFT / 2;
const HEAD = 22;
const HEAD_HALF = 18;

/**
 * 水平向左箭頭 — 圖號 201
 */
const arrowLeft = `
  ${ring}
  <rect x="34" y="${50 - HALF_SHAFT}" width="42" height="${SHAFT}" fill="${white}"/>
  <polygon points="22,50 42,32 42,68" fill="${white}"/>
`;

/**
 * 水平向右箭頭 — 圖號 202
 */
const arrowRight = `
  ${ring}
  <rect x="24" y="${50 - HALF_SHAFT}" width="42" height="${SHAFT}" fill="${white}"/>
  <polygon points="78,50 58,32 58,68" fill="${white}"/>
`;

/**
 * 直行箭頭 — 圖號 205
 */
const arrowStraight = `
  ${ring}
  <rect x="${50 - HALF_SHAFT}" y="38" width="${SHAFT}" height="40" fill="${white}"/>
  <polygon points="50,20 32,42 68,42" fill="${white}"/>
`;

/**
 * 左轉箭頭 — 圖號 203
 * 圖片為先上行再向左轉。
 */
const turnLeft = `
  ${ring}
  <path
    d="M66 76 L66 48 Q66 34 52 34 L42 34"
    fill="none"
    stroke="${white}"
    stroke-width="${SHAFT}"
    stroke-linecap="butt"
    stroke-linejoin="round"
  />
  <polygon points="22,34 44,16 44,52" fill="${white}"/>
`;

/**
 * 右轉箭頭 — 圖號 204
 * 圖片為先上行再向右轉。
 */
const turnRight = `
  ${ring}
  <path
    d="M34 76 L34 48 Q34 34 48 34 L58 34"
    fill="none"
    stroke="${white}"
    stroke-width="${SHAFT}"
    stroke-linecap="butt"
    stroke-linejoin="round"
  />
  <polygon points="78,34 56,16 56,52" fill="${white}"/>
`;

/**
 * 左或右 — 圖號 206
 * 箭頭頭部縮小約 8px：
 *   左箭頭：原 18,42 40,24 40,60 → 24,42 38,28 38,56
 *   右箭頭：原 82,42 60,24 60,60 → 76,42 62,28 62,56
 */
const leftRight = `
  ${ring}
  <path
    d="M50 76 L50 54 Q50 42 38 42 L36 42"
    fill="none"
    stroke="${white}"
    stroke-width="${SHAFT}"
    stroke-linecap="butt"
    stroke-linejoin="round"
  />
  <polygon points="24,42 38,28 38,56" fill="${white}"/>

  <path
    d="M50 54 Q50 42 62 42 L64 42"
    fill="none"
    stroke="${white}"
    stroke-width="${SHAFT}"
    stroke-linecap="butt"
    stroke-linejoin="round"
  />
  <polygon points="76,42 62,28 62,56" fill="${white}"/>
`;

/**
 * 左或直行 — 圖號 207
 * 直行軸內移至 x=54，左轉箭頭向內靠
 */
const straightLeft = `
  ${ring}
  <rect x="48" y="38" width="${SHAFT}" height="40" fill="${white}"/>
  <polygon points="54,24 39,42 69,42" fill="${white}"/>

  <path
    d="M54 58 L44 58"
    fill="none"
    stroke="${white}"
    stroke-width="${SHAFT}"
    stroke-linecap="butt"
    stroke-linejoin="round"
  />
  <polygon points="27,58 43,44 43,72" fill="${white}"/>
`;

/**
 * 直行或右 — 圖號 208
 * 直行軸內移至 x=46，右轉箭頭向內靠
 */
const straightRight = `
  ${ring}
  <rect x="40" y="38" width="${SHAFT}" height="40" fill="${white}"/>
  <polygon points="46,24 31,42 61,42" fill="${white}"/>

  <path
    d="M46 58 L56 58"
    fill="none"
    stroke="${white}"
    stroke-width="${SHAFT}"
    stroke-linecap="butt"
    stroke-linejoin="round"
  />
  <polygon points="73,58 57,44 57,72" fill="${white}"/>
`;

/**
 * 必須繞過安全島或障礙物 — 左下斜向
 * 圖號 209
 */
const keepLeftDown = `
  ${ring}
  <g transform="rotate(45 50 50)">
    <rect x="${50 - HALF_SHAFT}" y="30" width="${SHAFT}" height="40" fill="${white}"/>
    <polygon points="50,82 32,60 68,60" fill="${white}"/>
  </g>
`;

/**
 * 必須繞過安全島或障礙物 — 右下斜向
 * 圖號 210
 */
const keepRightDown = `
  ${ring}
  <g transform="rotate(-45 50 50)">
    <rect x="${50 - HALF_SHAFT}" y="30" width="${SHAFT}" height="40" fill="${white}"/>
    <polygon points="50,82 32,60 68,60" fill="${white}"/>
  </g>
`;

/**
 * 必須繞過安全島或障礙物 — 左右均可繞過
 * 圖號 211
 */
const keepBothSides = `
  ${ring}
  <g transform="rotate(18 36 50)">
    <rect x="30" y="26" width="10" height="38" fill="${white}"/>
    <polygon points="35,78 20,58 50,58" fill="${white}"/>
  </g>

  <g transform="rotate(-18 64 50)">
    <rect x="60" y="26" width="10" height="38" fill="${white}"/>
    <polygon points="65,78 50,58 80,58" fill="${white}"/>
  </g>
`;

/**
 * 環形應遵方向 — 圖號 212
 * 重新繪製：三段 100° 弧（每段間隔 20°），均勻分佈於半徑 22 的圓形軌道上。
 * 弧段起始角度（以正右方 0° 為基準，順時針）：
 *   弧1: -80° → 20°  (右上區段)
 *   弧2:  40° → 140° (右下到左下)
 *   弧3: 160° → 260° (左下到右上)
 * 每段弧末端附有順時針方向的箭頭頭部。
 */
const roundabout = `
  ${ring}

  <path
    d="M 53.8,28.3 A 22,22 0 0,1 70.7,57.5"
    fill="none"
    stroke="${white}"
    stroke-width="6"
    stroke-linecap="butt"
  />
  <polygon points="67.6,66.0 77.3,59.9 64.1,55.1" fill="${white}"/>

  <path
    d="M 66.9,64.1 A 22,22 0 0,1 33.1,64.1"
    fill="none"
    stroke="${white}"
    stroke-width="6"
    stroke-linecap="butt"
  />
  <polygon points="27.4,57.2 27.8,68.6 38.5,59.6" fill="${white}"/>

  <path
    d="M 29.3,57.5 A 22,22 0 0,1 46.2,28.3"
    fill="none"
    stroke="${white}"
    stroke-width="6"
    stroke-linecap="butt"
  />
  <polygon points="55.0,26.8 45.0,21.4 47.4,35.2" fill="${white}"/>
`;

/**
 * 公共運輸車輛專用車道 — 圖號 213
 * 簡化巴士圖案，貼近圖片中的白色巴士。
 */
const busLane = `
  ${ring}

  <rect
    x="18"
    y="36"
    width="64"
    height="28"
    rx="5"
    ry="5"
    fill="none"
    stroke="${white}"
    stroke-width="5"
  />

  <rect x="24" y="41" width="10" height="9" rx="2" fill="${white}"/>
  <rect x="39" y="41" width="11" height="9" rx="2" fill="${white}"/>
  <rect x="55" y="41" width="11" height="9" rx="2" fill="${white}"/>
  <rect x="70" y="41" width="7" height="9" rx="2" fill="${white}"/>

  <line x1="20" y1="57" x2="80" y2="57" stroke="${white}" stroke-width="4"/>

  <circle cx="34" cy="66" r="7" fill="${blue}" stroke="${white}" stroke-width="4"/>
  <circle cx="66" cy="66" r="7" fill="${blue}" stroke="${white}" stroke-width="4"/>
`;

/**
 * 電單車專用車道 — 圖號 214
 * 簡化騎士與電單車圖案。
 */
const motorcycleLane = `
  ${ring}

  <circle cx="32" cy="67" r="10" fill="none" stroke="${white}" stroke-width="5"/>
  <circle cx="68" cy="67" r="10" fill="none" stroke="${white}" stroke-width="5"/>

  <path
    d="M32 67 L45 54 L56 67 L68 67"
    fill="none"
    stroke="${white}"
    stroke-width="5"
    stroke-linecap="round"
    stroke-linejoin="round"
  />

  <path
    d="M45 54 L52 43 L62 49"
    fill="none"
    stroke="${white}"
    stroke-width="5"
    stroke-linecap="round"
    stroke-linejoin="round"
  />

  <path
    d="M52 43 L42 39"
    fill="none"
    stroke="${white}"
    stroke-width="5"
    stroke-linecap="round"
  />

  <circle cx="50" cy="31" r="6" fill="${white}"/>

  <path
    d="M50 37 L48 48 L40 55"
    fill="none"
    stroke="${white}"
    stroke-width="5"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
`;

/**
 * 額外：直行、左轉或右轉
 * 這不是你圖片 201–214 中的獨立圖號，但保留給原本 icon key 使用。
 */
const straightLeftRight = `
  ${ring}
  <rect x="${50 - HALF_SHAFT}" y="38" width="${SHAFT}" height="40" fill="${white}"/>
  <polygon points="50,20 32,42 68,42" fill="${white}"/>

  <path
    d="M50 60 L36 60"
    fill="none"
    stroke="${white}"
    stroke-width="${SHAFT}"
    stroke-linecap="butt"
  />
  <polygon points="18,60 40,42 40,78" fill="${white}"/>

  <path
    d="M50 60 L64 60"
    fill="none"
    stroke="${white}"
    stroke-width="${SHAFT}"
    stroke-linecap="butt"
  />
  <polygon points="82,60 60,42 60,78" fill="${white}"/>
`;

/**
 * 額外：U-turn。
 * 原始檔案有 u_turn / uturn_left / uturn_right。
 * 圖片 201–214 未見獨立 U-turn 標誌，因此保留為通用風格。
 */
const uTurn = `
  ${ring}
  <path
    d="M68 76 L68 50 A18 18 0 0 0 32 50 L32 64"
    fill="none"
    stroke="${white}"
    stroke-width="${SHAFT}"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
  <polygon points="32,80 16,60 48,60" fill="${white}"/>
`;

const uTurnRight = `
  ${ring}
  <path
    d="M32 76 L32 50 A18 18 0 0 1 68 50 L68 64"
    fill="none"
    stroke="${white}"
    stroke-width="${SHAFT}"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
  <polygon points="68,80 52,60 84,60" fill="${white}"/>
`;

/**
 * 額外：斜向前方
 * 原始檔案有 slight_left / slight_right。
 * 圖片 209/210 是向下斜箭頭；這裡保留向前斜箭頭給車道方向使用。
 */
const slightLeft = `
  ${ring}
  <g transform="rotate(-35 50 50)">
    <rect x="${50 - HALF_SHAFT}" y="38" width="${SHAFT}" height="40" fill="${white}"/>
    <polygon points="50,20 32,42 68,42" fill="${white}"/>
  </g>
`;

const slightRight = `
  ${ring}
  <g transform="rotate(35 50 50)">
    <rect x="${50 - HALF_SHAFT}" y="38" width="${SHAFT}" height="40" fill="${white}"/>
    <polygon points="50,20 32,42 68,42" fill="${white}"/>
  </g>
`;

/**
 * iconPaths
 *
 * 同時支援：
 * 1. 澳門圖號：'201' ~ '214'
 * 2. 語義名稱：left / right / straight 等
 * 3. 原本 LaneIcons.tsx 的部分 key
 */
const iconPaths: Record<string, string> = {
  /**
   * 澳門應遵標誌圖號
   */
  '201': arrowLeft,
  '202': arrowRight,
  '203': turnLeft,
  '204': turnRight,
  '205': arrowStraight,
  '206': leftRight,
  '207': straightLeft,
  '208': straightRight,
  '209': keepLeftDown,
  '210': keepRightDown,
  '211': keepBothSides,
  '212': roundabout,
  '213': busLane,
  '214': motorcycleLane,

  /**
   * 語義 key
   */
  left: arrowLeft,
  right: arrowRight,
  straight: arrowStraight,

  turn_left: turnLeft,
  turn_right: turnRight,

  left_right: leftRight,
  straight_left: straightLeft,
  straight_right: straightRight,
  straight_left_right: straightLeftRight,

  keep_left_down: keepLeftDown,
  keep_right_down: keepRightDown,
  keep_both_sides: keepBothSides,

  roundabout,
  bus_lane: busLane,
  motorcycle_lane: motorcycleLane,

  /**
   * 保留原始 API key
   */
  u_turn: uTurn,
  uturn_left: uTurn,
  uturn_right: uTurnRight,
  slight_left: slightLeft,
  slight_right: slightRight,

  /**
   * 原本的 merge_left / merge_right
   * 若業務上是表示必須繞過障礙物，可對應 209 / 210。
   */
  merge_left: keepLeftDown,
  merge_right: keepRightDown,
};

function createSvg(id: string): string {
  const content = iconPaths[id] || iconPaths.straight;

  return `
    <svg
      viewBox="0 0 100 100"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="mandatory traffic sign ${id}"
    >
      ${content}
    </svg>
  `;
}

const svgCache = new Map<string, string>();

function getCachedSvg(id: string): string {
  if (!svgCache.has(id)) {
    svgCache.set(id, createSvg(id));
  }

  return svgCache.get(id)!;
}

export interface LaneIconProps {
  /**
   * 可傳：
   * - '201' ~ '214'
   * - 'left'
   * - 'right'
   * - 'straight'
   * - 'turn_left'
   * - 'turn_right'
   * - 'straight_left'
   * - 'straight_right'
   * - 'left_right'
   * - 'roundabout'
   * - 'bus_lane'
   * - 'motorcycle_lane'
   */
  icon: string;

  /**
   * 圖示大小，單位 px。
   */
  size?: number;

  className?: string;
}

export const LaneIcon: React.FC<LaneIconProps> = ({
  icon,
  size = 48,
  className = '',
}) => {
  const svg = getCachedSvg(icon);

  return (
    <div
      className={`inline-block ${className}`}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};
