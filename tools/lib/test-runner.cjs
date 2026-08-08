'use strict';

/**
 * 极简测试运行器。不依赖外部库。
 *
 * 用法：
 *   const { test, suite, run } = require('./test-runner');
 *   suite('module', () => {
 *     test('case name', () => { assert.strictEqual(1, 1); });
 *   });
 *   run();
 */

const tests = [];
let currentSuite = 'ungrouped';

function suite(name, fn) {
  const prev = currentSuite;
  currentSuite = name;
  fn();
  currentSuite = prev;
}

function test(name, fn) {
  tests.push({ suite: currentSuite, name, fn });
}

function run() {
  const results = { passed: 0, failed: 0, errors: [] };
  const t0 = Date.now();
  for (const t of tests) {
    try {
      t.fn();
      results.passed++;
      process.stdout.write(`  \x1b[32m✓\x1b[0m ${t.suite} > ${t.name}\n`);
    } catch (e) {
      results.failed++;
      results.errors.push({ ...t, error: e });
      process.stdout.write(`  \x1b[31m✗\x1b[0m ${t.suite} > ${t.name}\n`);
      process.stdout.write(`      ${e.message}\n`);
    }
  }
  const t1 = Date.now();
  process.stdout.write(`\n\x1b[1m${results.passed} passed\x1b[0m, ${results.failed > 0 ? '\x1b[31m' : ''}${results.failed} failed\x1b[0m (${t1 - t0}ms)\n`);
  if (results.failed > 0) process.exit(1);
}

module.exports = { test, suite, run };
