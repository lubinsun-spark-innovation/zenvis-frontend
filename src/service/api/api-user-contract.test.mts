import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const userTypes = readFileSync(new URL('../../types/type-user.ts', import.meta.url), 'utf8');
const modernNav = readFileSync(new URL('../../components/layout/components/nav-menu-modern.vue', import.meta.url), 'utf8');

test('修改密码请求使用后端 snake_case JSON 契约', () => {
  const typeBlock = userTypes.match(/export type EditPasswordParams = \{[\s\S]*?\};/)?.[0] || '';
  assert.ok(typeBlock, 'EditPasswordParams 类型必须存在');

  assert.match(typeBlock, /old_password: string;/);
  assert.match(typeBlock, /\bpassword: string;/);
  assert.doesNotMatch(typeBlock, /oldPassword|newPassword|confirmPassword/);

  const callBlock = modernNav.match(/UserService\.editPassword\(\{[\s\S]*?\}\);/)?.[0] || '';
  assert.ok(callBlock, '新版导航必须提交修改密码请求');

  assert.match(callBlock, /old_password:/);
  assert.match(callBlock, /\bpassword:/);
  assert.doesNotMatch(callBlock, /oldPassword|newPassword|confirmPassword/);
});
