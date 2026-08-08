import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDateSafe } from './mental.service';
import { isReportDay } from './mentalAlert.service';

test('parseDateSafe: 中文日期解析', () => {
  const d = parseDateSafe('2026年6月1日');
  assert.ok(d);
  assert.equal(d!.getFullYear(), 2026);
  assert.equal(d!.getMonth(), 5); // 0-based
  assert.equal(d!.getDate(), 1);
});

test('parseDateSafe: 中文日期无日（默认取 1 号）', () => {
  const d = parseDateSafe('2026年6月');
  assert.ok(d);
  assert.equal(d!.getMonth(), 5);
  assert.equal(d!.getDate(), 1);
});

test('parseDateSafe: ISO 与斜杠日期', () => {
  assert.equal(parseDateSafe('2026-06-15')!.getDate(), 15);
  assert.equal(parseDateSafe('2026/6/15')!.getDate(), 15);
});

test('parseDateSafe: 非法输入返回 null 而非抛错', () => {
  assert.equal(parseDateSafe(null), null);
  assert.equal(parseDateSafe(''), null);
  assert.equal(parseDateSafe('未定'), null);
  assert.equal(parseDateSafe('abc'), null);
});

test('isReportDay: 报送日返回 true，其他日期 false', () => {
  assert.equal(isReportDay(new Date(2026, 5, 15), 15), true);
  assert.equal(isReportDay(new Date(2026, 5, 14), 15), false);
  assert.equal(isReportDay(new Date(2026, 5, 16), 15), false);
  assert.equal(isReportDay(new Date(2026, 5, 1), 15), false);
});
