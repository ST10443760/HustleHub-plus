const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { validationResult } = require('express-validator');
const {
  registerValidationRules,
  loginValidationRules,
  changePasswordRules,
  emptyBodyRules,
} = require('../src/middleware/validators');

async function errorsFor(rules, body) {
  const req = { body: { ...body } };
  for (const rule of rules) await rule.run(req);
  return validationResult(req).array().map((e) => e.msg);
}

describe('change-password validation', () => {
  const ok = { currentPassword: 'OldPassword1', newPassword: 'NewPassword2' };

  test('accepts a valid request', async () => {
    assert.deepEqual(await errorsFor(changePasswordRules, ok), []);
  });

  test('both fields are required', async () => {
    const errors = await errorsFor(changePasswordRules, {});
    assert.ok(errors.includes('Current password is required'));
    assert.ok(errors.includes('New password is required'));
  });

  test('fields must be text, not arrays or objects', async () => {
    assert.ok((await errorsFor(changePasswordRules, { ...ok, currentPassword: ['a'] })).includes('Current password must be text'));
    assert.ok((await errorsFor(changePasswordRules, { ...ok, newPassword: { $gt: '' } })).includes('New password must be text'));
  });

  test('unknown fields are rejected', async () => {
    const errors = await errorsFor(changePasswordRules, { ...ok, userId: 'someone-else' });
    assert.ok(errors.includes('Request contains fields that are not allowed'));
  });

  test('the new password follows the registration rules', async () => {
    assert.ok((await errorsFor(changePasswordRules, { ...ok, newPassword: 'short1' })).includes('New password must be at least 8 characters'));
    assert.ok((await errorsFor(changePasswordRules, { ...ok, newPassword: 'nodigitshere' })).includes('New password must contain at least one number'));
  });

  test('the new password must differ from the current one', async () => {
    const errors = await errorsFor(changePasswordRules, { currentPassword: 'SamePassword1', newPassword: 'SamePassword1' });
    assert.deepEqual(errors, ['New password must be different from the current password']);
  });

  test('bcrypt limit: at most 72 bytes, counted in bytes not characters', async () => {
    const tooLong = 'a1'.repeat(37); // 74 bytes
    assert.match((await errorsFor(changePasswordRules, { ...ok, newPassword: tooLong })).join(), /at most 72 bytes/);
    const emoji = `Pass1${'😀'.repeat(17)}`; // 5 + 17 x 4 = 73 bytes, only 22 characters
    assert.match((await errorsFor(changePasswordRules, { ...ok, newPassword: emoji })).join(), /at most 72 bytes/);
    assert.deepEqual(await errorsFor(changePasswordRules, { ...ok, newPassword: 'a1'.repeat(36) }), []); // exactly 72
  });
});

describe('register and login validation', () => {
  test('registration uses the same password rules, including the 72 byte limit', async () => {
    const base = { name: 'Test User', email: 'test@example.com', password: 'GoodPassword1' };
    assert.deepEqual(await errorsFor(registerValidationRules, base), []);
    assert.match((await errorsFor(registerValidationRules, { ...base, password: 'a1'.repeat(37) })).join(), /at most 72 bytes/);
    assert.ok((await errorsFor(registerValidationRules, { ...base, password: ['GoodPassword1'] })).includes('Password must be text'));
  });

  test('login rejects a password that is not text (instead of crashing bcrypt)', async () => {
    const errors = await errorsFor(loginValidationRules, { email: 'test@example.com', password: ['a', 'b'] });
    assert.deepEqual(errors, ['Password must be text']);
  });
});

describe('logout-all validation', () => {
  test('accepts an empty body', async () => {
    assert.deepEqual(await errorsFor(emptyBodyRules, {}), []);
  });

  test('rejects any body field', async () => {
    assert.deepEqual(await errorsFor(emptyBodyRules, { userId: 'x' }), ['Request contains fields that are not allowed']);
  });
});
