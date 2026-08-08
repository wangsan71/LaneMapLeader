'use strict';

/**
 * 統計報告：路段長度分佈、車道覆蓋度、命名覆蓋度、橋隧比例。
 */

function lengthBuckets(roads) {
  const buckets = [
    { name: '< 5m', min: 0, max: 5, count: 0 },
    { name: '5-20m', min: 5, max: 20, count: 0 },
    { name: '20-80m', min: 20, max: 80, count: 0 },
    { name: '80-200m', min: 80, max: 200, count: 0 },
    { name: '200-500m', min: 200, max: 500, count: 0 },
    { name: '> 500m', min: 500, max: Infinity, count: 0 },
  ];
  for (const r of roads) {
    for (const b of buckets) {
      if (r.length >= b.min && r.length < b.max) {
        b.count++;
        break;
      }
    }
  }
  return buckets;
}

function highwayDistribution(roads) {
  const map = new Map();
  for (const r of roads) {
    map.set(r.highway || 'unknown', (map.get(r.highway || 'unknown') || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([k, v]) => ({ highway: k, count: v }))
    .sort((a, b) => b.count - a.count);
}

function laneCoverage(roads) {
  let withTurnData = 0;
  let withInferred = 0;
  let withAllStraight = 0;
  for (const r of roads) {
    const totalLanes = (r.lanesForward?.length || 0) + (r.lanesBackward?.length || 0);
    if (totalLanes === 0) continue;
    const allStraight = (r.lanesForward || []).every(l => l.icon === 'straight')
      && (r.lanesBackward || []).every(l => l.icon === 'straight');
    if (r._hadOsmTurn) withTurnData++;
    if (allStraight) withAllStraight++;
    else withInferred++;
  }
  return { withTurnData, withInferred, withAllStraight };
}

function microSegmentCount(roads) {
  return roads.filter(r => r.length < 5).length;
}

function formatReport(stats) {
  const lines = [];
  lines.push('');
  lines.push('═══════════════════════════════════');
  lines.push('  路段統計');
  lines.push('═══════════════════════════════════');
  lines.push(`  總路段數:        ${stats.totalRoads}`);
  lines.push(`  總長度:          ${(stats.totalLengthMeters / 1000).toFixed(2)} km`);
  lines.push(`  平均段長:        ${stats.avgLength.toFixed(1)} m`);
  lines.push(`  微段 (< 5m):     ${stats.microSegments} 段`);
  lines.push('');
  lines.push('  道路類型分佈:');
  for (const h of stats.byHighway) {
    lines.push(`    ${h.highway.padEnd(20)} ${String(h.count).padStart(6)}`);
  }
  lines.push('');
  lines.push('  長度分佈:');
  for (const b of stats.byLength) {
    const bar = '█'.repeat(Math.min(40, Math.round(b.count / Math.max(1, stats.totalRoads) * 40)));
    lines.push(`    ${b.name.padEnd(10)} ${String(b.count).padStart(5)}  ${bar}`);
  }
  lines.push('');
  lines.push('  車道覆蓋:');
  lines.push(`    含 OSM turn:lanes 標籤:    ${stats.laneCoverage.withTurnData}`);
  lines.push(`    推斷出非直走車道:         ${stats.laneCoverage.withInferred}`);
  lines.push(`    全部直走 (默認):          ${stats.laneCoverage.withAllStraight}`);
  if (stats.bridges) lines.push(`    橋樑路段:                 ${stats.bridges}`);
  if (stats.tunnels) lines.push(`    隧道路段:                 ${stats.tunnels}`);
  if (stats.roundabouts) lines.push(`    環形交叉口:               ${stats.roundabouts}`);
  lines.push('');
  return lines.join('\n');
}

function summarize(roads) {
  const totalLength = roads.reduce((s, r) => s + r.length, 0);
  return {
    totalRoads: roads.length,
    totalLengthMeters: totalLength,
    avgLength: roads.length > 0 ? totalLength / roads.length : 0,
    microSegments: microSegmentCount(roads),
    byHighway: highwayDistribution(roads),
    byLength: lengthBuckets(roads),
    laneCoverage: laneCoverage(roads),
    bridges: roads.filter(r => r.bridge).length,
    tunnels: roads.filter(r => r.tunnel).length,
    roundabouts: roads.filter(r => r.junction === 'roundabout').length,
  };
}

module.exports = {
  summarize,
  formatReport,
  lengthBuckets,
  highwayDistribution,
  microSegmentCount,
};
