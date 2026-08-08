'use strict';

/**
 * 道路建置器单元测试。
 *
 * 运行：node tools/build_roads.test.cjs
 */

const assert = require('node:assert');
const { test, suite, run } = require('./lib/test-runner.cjs');

const geo = require('./lib/geo.cjs');
const { resolveName } = require('./lib/name-resolver.cjs');
const { parseTurnLanes, normalizeTurnToken, combineTurns } = require('./lib/lane-parser.cjs');
const { buildIntersectionGraph } = require('./lib/intersection-graph.cjs');
const { segmentWay, mergeMicroSegments } = require('./lib/segmenter.cjs');
const { inferLanesForEndpoint } = require('./lib/lane-inferrer.cjs');
const {
  isOneway,
  resolveLaneCounts,
  defaultStraightLanes,
  canMergeRoads,
  mergeRoads,
  finalize,
} = require('./lib/road-builder.cjs');
const { loadExclusions, shouldExclude } = require('./lib/exclusions.cjs');

// ============================================================
// geo
// ============================================================
suite('geo.haversine', () => {
  test('同點為 0', () => {
    assert.strictEqual(geo.haversine(22.1, 113.5, 22.1, 113.5), 0);
  });
  test('1 緯度 ≈ 111 km', () => {
    const d = geo.haversine(0, 0, 1, 0);
    assert.ok(Math.abs(d - 111195) < 100, `expected ~111195m, got ${d}`);
  });
  test('澳門內距離合理', () => {
    const d = geo.haversine(22.1987, 113.5439, 22.2070, 113.5590);
    assert.ok(d > 1500 && d < 2500, `expected 1.5~2.5km, got ${d}`);
  });
});

suite('geo.bearing', () => {
  test('向北為 0', () => {
    const b = geo.bearing(0, 0, 1, 0);
    assert.ok(Math.abs(b) < 1, `expected ~0, got ${b}`);
  });
  test('向東為 90', () => {
    const b = geo.bearing(0, 0, 0, 1);
    assert.ok(Math.abs(b - 90) < 1, `expected ~90, got ${b}`);
  });
  test('向南為 180', () => {
    const b = geo.bearing(0, 0, -1, 0);
    assert.ok(Math.abs(b - 180) < 1, `expected ~180, got ${b}`);
  });
  test('東北約 45', () => {
    const b = geo.bearing(0, 0, 1, 1);
    assert.ok(b > 40 && b < 50, `expected ~45, got ${b}`);
  });
});

suite('geo.angleDiff', () => {
  test('相同為 0', () => {
    assert.strictEqual(geo.angleDiff(45, 45), 0);
  });
  test('順時針 90', () => {
    assert.strictEqual(geo.angleDiff(0, 90), 90);
  });
  test('逆時針 -90', () => {
    assert.strictEqual(geo.angleDiff(0, 270), -90);
  });
  test('繞行 359 → -1', () => {
    assert.strictEqual(geo.angleDiff(0, 359), -1);
  });
});

suite('geo.simplifyPath', () => {
  test('少於 3 點原樣返回', () => {
    const p = [[0, 0], [1, 1]];
    assert.strictEqual(geo.simplifyPath(p, 1).length, 2);
  });
  test('直線共線點全部移除', () => {
    const p = [[0, 0], [0.5, 0], [1, 0]];
    const r = geo.simplifyPath(p, 0.0001);
    assert.strictEqual(r.length, 2);
  });
  test('容差為 0 不簡化', () => {
    const p = [[0, 0], [0.5, 0.001], [1, 0]];
    const r = geo.simplifyPath(p, 0);
    assert.strictEqual(r.length, 3);
  });
  test('彎曲處的點保留', () => {
    const p = [[0, 0], [0.5, 0.01], [1, 0], [1.5, 0.01], [2, 0]];
    const r = geo.simplifyPath(p, 5);
    assert.ok(r.length >= 4, `should keep some points, got ${r.length}`);
  });
});

// ============================================================
// name-resolver
// ============================================================
suite('name-resolver', () => {
  test('優先 name:zh-Hant', () => {
    const r = resolveName({
      name: 'Generic',
      'name:en': 'Generic EN',
      'name:zh-Hant': '繁體',
      'name:zh-Hans': '简体',
    });
    assert.strictEqual(r.primary, '繁體');
    // 預設 secondaryPriority 偏好 en/pt，所以會選 en
    assert.strictEqual(r.secondary, 'Generic EN');
  });
  test('指定 secondaryPriority 偏好不同 script', () => {
    const r = resolveName(
      {
        name: 'Generic',
        'name:en': 'Generic EN',
        'name:zh-Hant': '繁體',
        'name:zh-Hans': '简体',
      },
      { secondaryPriority: ['name:zh-Hans', 'name:en', 'name'] }
    );
    assert.strictEqual(r.primary, '繁體');
    assert.strictEqual(r.secondary, '简体');
  });
  test('只有 name 時 fallback', () => {
    const r = resolveName({ name: 'Only Name' });
    assert.strictEqual(r.primary, 'Only Name');
  });
  test('fallback 到 ref', () => {
    const r = resolveName({ ref: 'G105' }, { fallback: 'ref' });
    assert.strictEqual(r.primary, 'G105');
  });
  test('無名稱時空字串', () => {
    const r = resolveName({});
    assert.strictEqual(r.primary, '');
  });
});

// ============================================================
// lane-parser
// ============================================================
suite('lane-parser.normalizeTurnToken', () => {
  test('left → left', () => assert.strictEqual(normalizeTurnToken('left'), 'left'));
  test('LEFT → left', () => assert.strictEqual(normalizeTurnToken('LEFT'), 'left'));
  test('sharp left → left', () => assert.strictEqual(normalizeTurnToken('sharp left'), 'left'));
  test('through → straight', () => assert.strictEqual(normalizeTurnToken('through'), 'straight'));
  test('none → straight', () => assert.strictEqual(normalizeTurnToken('none'), 'straight'));
  test('reverse → u_turn', () => assert.strictEqual(normalizeTurnToken('reverse'), 'u_turn'));
  test('unknown → null', () => assert.strictEqual(normalizeTurnToken('garbage'), null));
});

suite('lane-parser.combineTurns', () => {
  test('空 → straight', () => {
    assert.strictEqual(combineTurns([]).icon, 'straight');
  });
  test('單一 left', () => {
    assert.strictEqual(combineTurns(['left']).icon, 'left');
  });
  test('straight + left → straight_left', () => {
    assert.strictEqual(combineTurns(['through', 'left']).icon, 'straight_left');
  });
  test('left + right → left_right', () => {
    assert.strictEqual(combineTurns(['left', 'right']).icon, 'left_right');
  });
  test('三向 → straight_left_right', () => {
    assert.strictEqual(combineTurns(['through', 'left', 'right']).icon, 'straight_left_right');
  });
  test('uturn + left → uturn_left', () => {
    assert.strictEqual(combineTurns(['reverse', 'left']).icon, 'uturn_left');
  });
});

suite('lane-parser.parseTurnLanes', () => {
  test('基本 2 車道', () => {
    const r = parseTurnLanes('through|right', 2);
    assert.strictEqual(r.length, 2);
    assert.strictEqual(r[0].icon, 'straight');
    assert.strictEqual(r[1].icon, 'right');
  });
  test('超過期望數量截斷', () => {
    const r = parseTurnLanes('through|through|right|right', 2);
    assert.strictEqual(r.length, 2);
  });
  test('少於期望補齊', () => {
    const r = parseTurnLanes('through', 3);
    assert.strictEqual(r.length, 3);
    assert.strictEqual(r[2].icon, 'straight');
  });
  test('多 turn 組合', () => {
    const r = parseTurnLanes('through;left|right|through', 3);
    assert.strictEqual(r[0].icon, 'straight_left');
    assert.strictEqual(r[1].icon, 'right');
    assert.strictEqual(r[2].icon, 'straight');
  });
  test('空字串返回 null', () => {
    assert.strictEqual(parseTurnLanes(''), null);
  });
});

// ============================================================
// intersection-graph
// ============================================================
suite('intersection-graph', () => {
  test('3 條 way 共享 = 路口', () => {
    const elements = [
      { type: 'way', id: 1, nodes: [10, 20] },
      { type: 'way', id: 2, nodes: [30, 20] },
      { type: 'way', id: 3, nodes: [20, 40] },
    ];
    const g = buildIntersectionGraph(elements, new Set([1, 2, 3]));
    assert.ok(g.isIntersection(20));
    assert.ok(!g.isIntersection(10));
  });
  test('2 條 way 共享 = 接合點（端點）', () => {
    const elements = [
      { type: 'way', id: 1, nodes: [10, 20] },
      { type: 'way', id: 2, nodes: [20, 30] },
    ];
    const g = buildIntersectionGraph(elements, new Set([1, 2]));
    assert.ok(!g.isIntersection(20));
    assert.ok(g.isEndpoint(20));
  });
  test('1 條 way 端點 = endpoint', () => {
    const elements = [
      { type: 'way', id: 1, nodes: [10, 20, 30] },
    ];
    const g = buildIntersectionGraph(elements, new Set([1]));
    assert.ok(g.isEndpoint(10));
    assert.ok(g.isEndpoint(30));
    assert.ok(!g.isEndpoint(20));
  });
});

// ============================================================
// segmenter
// ============================================================
suite('segmenter', () => {
  test('太短 way 不切段', () => {
    const r = segmentWay([[0, 0], [0.0001, 0]], [], new Set(), new Set(), 'residential');
    assert.strictEqual(r.length, 1);
  });
  test('長 way 按道路等級切段（residential 上限 80m）', () => {
    // 0.0001° lng 在 22° lat ≈ 10.7m；20 點 = ~193m
    // residential 上限 80m → 應至少切 2 段
    const path = [];
    for (let i = 0; i <= 20; i++) path.push([22.1, 113.5 + i * 0.0001]);
    const r = segmentWay(path, [], new Set(), new Set(), 'residential');
    assert.ok(r.length >= 2, `expected >=2 segments, got ${r.length}`);
  });
  test('motorway 段長上限放寬', () => {
    // 30 點 = ~290m；residential 應切 3+，motorway 200m 上限應切 1
    const path = [];
    for (let i = 0; i <= 30; i++) path.push([22.1, 113.5 + i * 0.0001]);
    const residential = segmentWay(path, [], new Set(), new Set(), 'residential');
    const motorway = segmentWay(path, [], new Set(), new Set(), 'motorway');
    assert.ok(motorway.length < residential.length, `motorway should have fewer segments`);
  });
  test('急彎處切段', () => {
    const path = [
      [0, 0], [0.001, 0], [0.002, 0],
      [0.003, 0.001],
      [0.003, 0.002], [0.003, 0.003],
    ];
    const r = segmentWay(path, [], new Set(), new Set(), 'residential');
    assert.ok(r.length >= 2, `expected >=2 segments at sharp turn, got ${r.length}`);
  });
  test('路口處必切', () => {
    const path = [[0, 0], [0, 0.001], [0, 0.002]];
    const r = segmentWay(path, [1, 99, 2], new Set([99]), new Set(), 'residential');
    assert.strictEqual(r.length, 2, 'should split at intersection node');
  });
  test('mergeMicroSegments 合併短段', () => {
    const segs = [
      { path: [[0, 0], [0, 0.0001]], length: 10, name: 'Foo' },
      { path: [[0, 0.0001], [0, 0.005]], length: 3, name: 'Foo' },
      { path: [[0, 0.005], [0, 0.01]], length: 8, name: 'Foo' },
    ];
    const merged = mergeMicroSegments(segs, (s) => s.name);
    assert.strictEqual(merged.length, 2, 'should merge 3 → 2');
  });
});

// ============================================================
// lane-inferrer
// ============================================================
suite('lane-inferrer', () => {
  test('無出口不變', () => {
    const r = inferLanesForEndpoint({
      path: [[0, 0], [0, 0.001]],
      direction: 'forward',
      myWayName: 'A',
      branches: [],
      currentLanes: [{ icon: 'straight', label: '直走' }],
    });
    assert.strictEqual(r.modified, false);
  });
  test('有左出口（無直走出口）→ 最左變 left', () => {
    const r = inferLanesForEndpoint({
      path: [[0, 0], [0, 0.001]],
      direction: 'forward',
      myWayName: 'A',
      branches: [{ wayId: 1, angle: -90, otherName: 'B' }],
      currentLanes: [
        { icon: 'straight', label: '直走' },
        { icon: 'straight', label: '直走' },
      ],
    });
    assert.strictEqual(r.modified, true);
    assert.strictEqual(r.lanes[0].icon, 'left');
    assert.strictEqual(r.lanes[1].icon, 'straight');
  });
  test('有左 + 直出口（不同 way）→ 最左變 straight_left', () => {
    const r = inferLanesForEndpoint({
      path: [[0, 0], [0, 0.001]],
      direction: 'forward',
      myWayName: 'A',
      branches: [
        { wayId: 1, angle: -90, otherName: 'B' }, // 左出口
        { wayId: 2, angle: 3, otherName: 'C' },  // 不同名的直走出口
      ],
      currentLanes: [
        { icon: 'straight', label: '直走' },
        { icon: 'straight', label: '直走' },
      ],
    });
    assert.strictEqual(r.modified, true);
    assert.strictEqual(r.lanes[0].icon, 'straight_left');
    assert.strictEqual(r.lanes[1].icon, 'straight');
  });
  test('有右出口 + 直走（不同 way）→ 最右 straight_right', () => {
    const r = inferLanesForEndpoint({
      path: [[0, 0], [0, 0.001]],
      direction: 'forward',
      myWayName: 'A',
      branches: [
        { wayId: 1, angle: 90, otherName: 'B' }, // 右出口
        { wayId: 2, angle: 3, otherName: 'C' }, // 不同名的直走出口
      ],
      currentLanes: [
        { icon: 'straight', label: '直走' },
        { icon: 'straight', label: '直走' },
      ],
    });
    assert.strictEqual(r.modified, true);
    assert.strictEqual(r.lanes[1].icon, 'straight_right');
  });
  test('4 車道 + 左右出口', () => {
    const r = inferLanesForEndpoint({
      path: [[0, 0], [0, 0.001]],
      direction: 'forward',
      myWayName: 'A',
      branches: [
        { wayId: 1, angle: -90, otherName: 'B' },
        { wayId: 2, angle: 90, otherName: 'C' },
      ],
      currentLanes: defaultStraightLanes(4),
    });
    assert.strictEqual(r.modified, true);
    assert.ok(['straight_left', 'left'].includes(r.lanes[0].icon));
    assert.ok(['straight_left', 'left'].includes(r.lanes[1].icon));
    assert.ok(['straight_right', 'right'].includes(r.lanes[2].icon));
    assert.ok(['straight_right', 'right'].includes(r.lanes[3].icon));
  });
  test('同路延續被過濾', () => {
    const r = inferLanesForEndpoint({
      path: [[0, 0], [0, 0.001]],
      direction: 'forward',
      myWayName: 'A',
      branches: [
        { wayId: 1, angle: 5, otherName: 'A' },
      ],
      currentLanes: [{ icon: 'straight', label: '直走' }],
    });
    assert.strictEqual(r.modified, false);
  });
});

// ============================================================
// road-builder
// ============================================================
suite('road-builder.isOneway', () => {
  test('oneway=yes', () => {
    assert.deepStrictEqual(isOneway({ oneway: 'yes' }), { oneway: true, reversed: false, roundabout: false });
  });
  test('oneway=-1', () => {
    assert.deepStrictEqual(isOneway({ oneway: '-1' }), { oneway: true, reversed: true, roundabout: false });
  });
  test('junction=roundabout', () => {
    assert.deepStrictEqual(isOneway({ junction: 'roundabout' }), { oneway: true, reversed: false, roundabout: true });
  });
  test('無標籤', () => {
    assert.deepStrictEqual(isOneway({}), { oneway: false, reversed: false, roundabout: false });
  });
});

suite('road-builder.resolveLaneCounts', () => {
  test('oneway 用 total', () => {
    const r = resolveLaneCounts({ oneway: 'yes', lanes: '3' });
    assert.strictEqual(r.forward, 3);
    assert.strictEqual(r.backward, 0);
  });
  test('oneway 反向', () => {
    const r = resolveLaneCounts({ oneway: '-1', lanes: '3' });
    assert.strictEqual(r.forward, 0);
    assert.strictEqual(r.backward, 3);
  });
  test('雙向 lanes:forward/backward', () => {
    const r = resolveLaneCounts({ 'lanes:forward': '2', 'lanes:backward': '1' });
    assert.strictEqual(r.forward, 2);
    assert.strictEqual(r.backward, 1);
  });
  test('雙向只有 total', () => {
    const r = resolveLaneCounts({ lanes: '4' });
    assert.strictEqual(r.forward, 2);
    assert.strictEqual(r.backward, 2);
  });
  test('雙向 total 單數 → forward 多', () => {
    const r = resolveLaneCounts({ lanes: '5' });
    assert.strictEqual(r.forward, 3);
    assert.strictEqual(r.backward, 2);
  });
  test('完全無標籤用預設', () => {
    const r = resolveLaneCounts({ highway: 'primary' });
    assert.strictEqual(r.forward, 2);
    assert.strictEqual(r.backward, 2);
  });
});

suite('road-builder.canMergeRoads', () => {
  test('同名同類可合併', () => {
    const a = {
      name: 'Foo', highway: 'primary', oneway: false,
      lanesForward: [{ icon: 'straight', label: '直走' }],
      lanesBackward: [], path: [[0, 0], [0, 0.001]],
    };
    const b = {
      name: 'Foo', highway: 'primary', oneway: false,
      lanesForward: [{ icon: 'straight', label: '直走' }],
      lanesBackward: [], path: [[0, 0.001], [0, 0.002]],
    };
    assert.strictEqual(canMergeRoads(a, b), 'forward');
  });
  test('不同名不可合併', () => {
    const a = { name: 'A', highway: 'primary', oneway: false, lanesForward: [], lanesBackward: [], path: [[0, 0], [0, 0.001]] };
    const b = { name: 'B', highway: 'primary', oneway: false, lanesForward: [], lanesBackward: [], path: [[0, 0.001], [0, 0.002]] };
    assert.strictEqual(canMergeRoads(a, b), false);
  });
  test('車道不同不可合併', () => {
    const a = { name: 'A', highway: 'primary', oneway: false,
      lanesForward: [{ icon: 'left', label: '左' }], lanesBackward: [],
      path: [[0, 0], [0, 0.001]] };
    const b = { name: 'A', highway: 'primary', oneway: false,
      lanesForward: [{ icon: 'right', label: '右' }], lanesBackward: [],
      path: [[0, 0.001], [0, 0.002]] };
    assert.strictEqual(canMergeRoads(a, b), false);
  });
  test('manual override 阻擋合併', () => {
    const a = { name: 'A', highway: 'primary', oneway: false,
      lanesForward: [], lanesBackward: [],
      path: [[0, 0], [0, 0.001]], _manualOverride: true };
    const b = { name: 'A', highway: 'primary', oneway: false,
      lanesForward: [], lanesBackward: [],
      path: [[0, 0.001], [0, 0.002]] };
    assert.strictEqual(canMergeRoads(a, b), false);
  });
});

suite('road-builder.mergeRoads', () => {
  test('3 條可合併成 1', () => {
    const roads = [
      { name: 'A', highway: 'primary', oneway: false, lanesForward: [], lanesBackward: [],
        path: [[0, 0], [0, 0.001]], length: 10 },
      { name: 'A', highway: 'primary', oneway: false, lanesForward: [], lanesBackward: [],
        path: [[0, 0.001], [0, 0.002]], length: 10 },
      { name: 'A', highway: 'primary', oneway: false, lanesForward: [], lanesBackward: [],
        path: [[0, 0.002], [0, 0.003]], length: 10 },
    ];
    const m = mergeRoads(roads);
    assert.strictEqual(m.length, 1);
    assert.ok(m[0].length > 25);
  });
});

suite('road-builder.finalize', () => {
  test('清理內部欄位 + 重新編號', () => {
    const roads = [
      { id: 'old1', name: 'A', path: [], lanesForward: [], lanesBackward: [],
        _hasOsmTurnData: true, _manualOverride: true, length: 1 },
      { id: 'old2', name: 'B', path: [], lanesForward: [], lanesBackward: [],
        _hasOsmTurnData: false, _manualOverride: false, length: 2 },
    ];
    const f = finalize(roads);
    assert.strictEqual(f[0].id, 'road_1');
    assert.strictEqual(f[1].id, 'road_2');
    assert.strictEqual(f[0]._hasOsmTurnData, undefined);
    assert.strictEqual(f[0]._manualOverride, undefined);
  });
});

// ============================================================
// exclusions
// ============================================================
suite('exclusions', () => {
  test('內嵌名稱匹配', () => {
    const e = loadExclusions({});
    assert.ok(shouldExclude('横琴', e));
    assert.ok(shouldExclude('長隆', e));
    assert.ok(!shouldExclude('友誼大馬路', e));
  });
  test('空名不排除', () => {
    const e = loadExclusions({});
    assert.strictEqual(shouldExclude('', e), false);
    assert.strictEqual(shouldExclude(null, e), false);
  });
});

run();
