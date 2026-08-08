'use strict';

/**
 * 多語種路名解析。
 *
 * OSM 的 name 標籤族：
 *   name            — 當地慣用語（澳門常見中文 + 葡文混排）
 *   name:zh-Hant    — 繁體中文
 *   name:zh-Hans    — 簡體中文
 *   name:zh         — 中文（不指定字體）
 *   name:en         — 英文
 *   name:pt         — 葡文
 *   ref             — 編號（如 G105）
 *   int_ref / nat_ref
 *
 * 預設策略（可由 build_roads.cjs 覆蓋）：
 *   1. name:zh-Hant（澳門本地最權威）
 *   2. name:zh（fallback）
 *   3. name:en
 *   4. name:pt
 *   5. name（OSM 默認）
 *   6. ref
 *
 * 輸出 `{ primary, secondary }`：
 *   primary 用於顯示
 *   secondary 保留為附屬（如果兩種語言都有，就並列存）
 */

/**
 * @param {object} tags - OSM tags
 * @param {object} [options]
 * @param {string[]} [options.priority] - 自訂優先級
 * @param {string[]} [options.secondaryPriority] - 第二語言的優先級（預設偏英文/葡文）
 * @param {string}   [options.fallback] - 最終 fallback（如 'name' 或 'ref'）
 * @returns {{ primary: string, secondary: string|null, all: Record<string,string> }}
 */
function resolveName(tags, options = {}) {
  const priority = options.priority || [
    'name:zh-Hant',
    'name:zh',
    'name:en',
    'name:pt',
    'name',
  ];
  // 第二語言：通常選與主語言不同 script 的，例如繁中主 → 英文次
  const secondaryPriority = options.secondaryPriority || [
    'name:en',
    'name:pt',
    'name:zh-Hans',
    'name:zh',
    'name',
  ];
  const fallback = options.fallback || 'ref';

  const all = {};
  for (const k of Object.keys(tags)) {
    if (k === 'name' || k.startsWith('name:')) {
      const v = (tags[k] || '').trim();
      if (v) all[k] = v;
    }
  }
  if (fallback && tags[fallback]) {
    const v = String(tags[fallback]).trim();
    if (v && !all[fallback]) all[fallback] = v;
  }

  let primary = '';
  for (const k of priority) {
    if (all[k]) {
      primary = all[k];
      break;
    }
  }
  if (!primary) {
    primary = tags.name || tags.ref || '';
  }

  // 第二語言：按 secondaryPriority 順序找第一個與 primary 不同的
  let secondary = null;
  for (const k of secondaryPriority) {
    if (all[k] && all[k] !== primary) {
      secondary = all[k];
      break;
    }
  }

  return { primary, secondary, all };
}

module.exports = { resolveName };
