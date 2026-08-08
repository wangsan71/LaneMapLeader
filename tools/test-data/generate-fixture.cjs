'use strict';

/**
 * 构造一个合成 OSM fixture 用于端到端测试。
 *
 * 场景：
 *   - 一条南北主路（N-S Main St，primary，4 车道双行）
 *   - 一条东西主路（E-W Ave，primary，2 车道双行）
 *   - 在交叉口处，南北主路带 turn:lanes 标记
 *   - 一条死胡同（residential，oneway）
 *   - 一个环岛（roundabout）
 *   - 一条跨海大桥（bridge）
 */

const fs = require('fs');
const path = require('path');

const nodes = [
  // ── N-S 主路节点 ──
  { type: 'node', id: 1, lat: 22.1900, lon: 113.5400 },
  { type: 'node', id: 2, lat: 22.1920, lon: 113.5400 },
  { type: 'node', id: 3, lat: 22.1940, lon: 113.5400 },
  { type: 'node', id: 4, lat: 22.1960, lon: 113.5400 },  // 交叉口
  { type: 'node', id: 5, lat: 22.1980, lon: 113.5400 },
  { type: 'node', id: 6, lat: 22.2000, lon: 113.5400 },
  { type: 'node', id: 7, lat: 22.2020, lon: 113.5400 },
  // ── E-W 路节点 ──
  { type: 'node', id: 10, lat: 22.1960, lon: 113.5380 },
  { type: 'node', id: 11, lat: 22.1960, lon: 113.5390 },
  { type: 'node', id: 12, lat: 22.1960, lon: 113.5400 },  // 交叉口 = node 4
  { type: 'node', id: 13, lat: 22.1960, lon: 113.5410 },
  { type: 'node', id: 14, lat: 22.1960, lon: 113.5420 },
  // ── 死胡同 ──
  { type: 'node', id: 20, lat: 22.1940, lon: 113.5410 },
  { type: 'node', id: 21, lat: 22.1940, lon: 113.5420 },
  { type: 'node', id: 22, lat: 22.1940, lon: 113.5430 },
  // ── 环岛（4 节点近似圆形）──
  { type: 'node', id: 30, lat: 22.2050, lon: 113.5400 },
  { type: 'node', id: 31, lat: 22.2050, lon: 113.5410 },
  { type: 'node', id: 32, lat: 22.2040, lon: 113.5410 },
  { type: 'node', id: 33, lat: 22.2040, lon: 113.5400 },
  // 环岛入口（接 N-S 主路）
  { type: 'node', id: 40, lat: 22.2035, lon: 113.5400 },
  { type: 'node', id: 41, lat: 22.2050, lon: 113.5395 },
  // 桥
  { type: 'node', id: 50, lat: 22.2000, lon: 113.5400 },
  { type: 'node', id: 51, lat: 22.1980, lon: 113.5400 },
];

const ways = [
  {
    id: 100,
    type: 'way',
    nodes: [1, 2, 3, 4],
    tags: {
      highway: 'primary',
      name: '南北大街',
      'name:en': 'North-South Main St',
      'name:zh-Hant': '南北大街',
      'name:zh-Hans': '南北大街',
      lanes: '4',
      'turn:lanes': 'through|through|right|right',
    },
  },
  {
    id: 101,
    type: 'way',
    nodes: [4, 5, 6, 7],
    tags: {
      highway: 'primary',
      name: '南北大街',
      'name:en': 'North-South Main St',
      'name:zh-Hant': '南北大街',
      lanes: '4',
      'turn:lanes': 'through|through|left|left',
    },
  },
  {
    id: 200,
    type: 'way',
    nodes: [10, 11, 12],
    tags: {
      highway: 'primary',
      name: '東西大道',
      'name:en': 'East-West Ave',
      'name:zh-Hant': '東西大道',
      'name:pt': 'Avenida Leste-Oeste',
    },
  },
  {
    id: 201,
    type: 'way',
    nodes: [12, 13, 14],
    tags: {
      highway: 'primary',
      name: '東西大道',
      'name:en': 'East-West Ave',
      'name:zh-Hant': '東西大道',
    },
  },
  {
    id: 300,
    type: 'way',
    nodes: [3, 20, 21, 22],
    tags: {
      highway: 'residential',
      name: '彎彎小路',
      'name:en': 'Winding Lane',
      oneway: 'yes',
    },
  },
  {
    id: 400,
    type: 'way',
    nodes: [30, 31, 32, 33, 30],  // 闭合环
    tags: {
      highway: 'primary',
      name: '中央環島',
      junction: 'roundabout',
    },
  },
  // 环岛入口（从 N-S 主路接入）
  {
    id: 401,
    type: 'way',
    nodes: [40, 30],
    tags: {
      highway: 'primary',
      name: '南北大街',
    },
  },
  {
    id: 402,
    type: 'way',
    nodes: [33, 7],
    tags: {
      highway: 'primary',
      name: '南北大街',
    },
  },
  // 桥
  {
    id: 500,
    type: 'way',
    nodes: [50, 51],
    tags: {
      highway: 'secondary',
      name: '友誼大橋',
      'name:en': 'Friendship Bridge',
      bridge: 'yes',
      layer: '1',
      lanes: '3',
    },
  },
];

const out = {
  version: 0.6,
  generator: 'generate-fixture.cjs',
  elements: [...nodes, ...ways],
};

const outPath = path.join(__dirname, 'fixture.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
console.log(`已生成 ${outPath} (${nodes.length} nodes + ${ways.length} ways)`);
