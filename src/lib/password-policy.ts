const COMMON_PASSWORDS = new Set([
  "password",
  "12345678",
  "qwerty12",
  "abc12345",
  "11111111",
  "password1",
  "123456789",
  "1234567890",
  "iloveyou",
  "admin123",
  "letmein1",
  "welcome1",
]);

export type PasswordCheck = { ok: boolean; errors: string[] };

/** مطابق لـ NIST SP 800-63B: 8+ أحرف + حرف + رقم + ليست شائعة */
export function checkPasswordStrength(pw: string): PasswordCheck {
  const errors: string[] = [];
  if (!pw || pw.length < 8)
    errors.push("كلمة المرور قصيرة جدًا (8 أحرف على الأقل)");
  if (!/[a-zA-Z]/.test(pw)) errors.push("كلمة المرور يجب أن تحتوي على أحرف");
  if (!/[0-9]/.test(pw))
    errors.push("كلمة المرور يجب أن تحتوي على رقم واحد على الأقل");
  if (COMMON_PASSWORDS.has((pw || "").toLowerCase()))
    errors.push("كلمة المرور ممنوعة — شائعة جدًا");
  return { ok: errors.length === 0, errors };
}
