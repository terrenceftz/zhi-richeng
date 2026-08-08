import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractQueryKeyword, cleanKeyword } from './studentQuery.service';

test('extractQueryKeyword: 各种查询措辞都能正确提取姓名', () => {
  const cases: [string, string][] = [
    ['查一下张晨睿', '张晨睿'],
    ['查一下 张晨睿', '张晨睿'],
    ['查一下张晨睿的信息', '张晨睿'],
    ['查查张三', '张三'],
    ['查一查李四', '李四'],
    ['我想查王五', '王五'],
    ['帮我查赵六', '赵六'],
    ['查询陈七', '陈七'],
    ['学生 周八', '周八'],
    ['查 吴九', '吴九'],
    ['找一下郑十', '郑十'],
    ['搜一下孙一', '孙一'],
    ['搜索钱二', '钱二'],
    ['查一下 林三的信息', '林三'],
    ['查看 黄四', '黄四'],
  ];
  for (const [input, expect] of cases) {
    assert.equal(extractQueryKeyword(input), expect, `input: ${input}`);
  }
});

test('extractQueryKeyword: 非查询消息返回 null', () => {
  for (const input of ['你好', '明天开会', '台账学生列表', '帮我写个通知', '']) {
    assert.equal(extractQueryKeyword(input), null, `input: ${input}`);
  }
});

test('extractQueryKeyword: 纯台账类消息不应被当作姓名查询', () => {
  assert.equal(extractQueryKeyword('台账'), null);
  assert.equal(extractQueryKeyword('台账学生'), null);
  assert.equal(extractQueryKeyword('重点关注'), null);
});

test('cleanKeyword: 去掉常见尾缀', () => {
  assert.equal(cleanKeyword('张晨睿的信息'), '张晨睿');
  assert.equal(cleanKeyword('张晨睿 的资料'), '张晨睿');
  assert.equal(cleanKeyword('李四的情况'), '李四');
  assert.equal(cleanKeyword('王五 的联系方式'), '王五');
  assert.equal(cleanKeyword('张三详细信息'), '张三');
  assert.equal(cleanKeyword('张三的台账'), '张三');
  assert.equal(cleanKeyword('张三'), '张三');
});
