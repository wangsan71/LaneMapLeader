'use strict';

/**
 * 可配置排除列表。
 *
 * 数据源（按优先级）：
 *   1. 命令行 --exclude-file <path> 指定的 JSON
 *   2. public/data/<city>/exclude.json（若存在）
 *   3. 兜底内嵌（澳門默認，與舊版保持一致）
 *
 * 文件格式：
 *   {
 *     "names": ["路名A", "路名B"],
 *     "patterns": ["^.*隧道$", "BRIDGE$"]
 *   }
 */

const fs = require('fs');
const path = require('path');

const FALLBACK_NAMES = [
  // 澳門預設（從舊 build_roads.cjs 搬出）
  '横琴', '橫琴', '环岛', '環島', '情侣路', '情侶路', '长隆', '長隆',
  '荣澳', '榮澳', '琴海', '汇通', '匯通', '海翼橋', '海琴桥', '海琴橋',
  '非桥', '非橋', '艺文', '藝文',
  '天羽道', '伯牙', '知音', '宝盛路', '寶盛路', '富祥湾', '富祥灣',
  '屏湾', '屏灣', '会展', '會展', '通航', '银湾路', '銀灣路',
  '大横琴山', '大橫琴山', '福临道', '福臨道', '安临路', '安臨路',
  '吉临路', '吉臨路', '香江路', '粤华路', '粵華路', '顺景路', '順景路',
  '荣港道', '榮港道', '十字门', '十字門',
  '南湾北路', '南灣北路', '南湾南路', '南灣南路', '桂花南路',
  '港澳大道', '港澳大道辅路', '港澳大道輔路',
  '前河东路', '前河東路', '前河西路', '港昌路',
  '侨光路', '僑光路', '昌平路', '湾仔', '灣仔',
  '珠三角环线', '珠三角環線', '拱北湾大桥', '拱北灣大橋',
  '祥澳路', '荣粤道', '榮粤道', '兴澳路', '興澳路',
  '联澳路', '聯澳路', '观澳路', '觀澳路', '海鸣桥', '海鳴橋',
  '珠澳路', '子期', '琴石道', '琴石隧道',
  '海贝桥', '海貝橋', '海韵橋', '海韻橋', '海韻桥',
  '依依桥', '依依橋', '富琴道', '都会道', '都會道',
  '北珠', '岛东路', '島東路', '兴盛三路', '興盛三路', '富城道',
];

/**
 * 加載排除列表。
 * @param {object} options
 * @param {string} [options.cityDir] - 城市資料目錄
 * @param {string} [options.excludeFile] - 命令行指定的額外檔案
 * @returns {{ names: Set<string>, patterns: RegExp[] }}
 */
function loadExclusions(options = {}) {
  const names = new Set(FALLBACK_NAMES);
  const patterns = [];

  // 1. 城市目錄下的 exclude.json
  if (options.cityDir) {
    const cityFile = path.join(options.cityDir, 'exclude.json');
    if (fs.existsSync(cityFile)) {
      mergeFromFile(cityFile, names, patterns);
    }
  }

  // 2. 命令行指定
  if (options.excludeFile) {
    if (!fs.existsSync(options.excludeFile)) {
      throw new Error(`排除列表檔案不存在: ${options.excludeFile}`);
    }
    mergeFromFile(options.excludeFile, names, patterns);
  }

  return { names, patterns };
}

function mergeFromFile(file, names, patterns) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (Array.isArray(data.names)) {
      data.names.forEach(n => names.add(String(n)));
    }
    if (Array.isArray(data.patterns)) {
      data.patterns.forEach(p => patterns.push(new RegExp(p)));
    }
  } catch (e) {
    console.warn(`⚠ 無法讀取排除列表 ${file}: ${e.message}`);
  }
}

/**
 * 判斷是否應排除此 way。
 */
function shouldExclude(name, excluder) {
  if (!name) return false;
  if (excluder.names.has(name)) return true;
  for (const re of excluder.patterns) {
    if (re.test(name)) return true;
  }
  return false;
}

module.exports = { loadExclusions, shouldExclude };
