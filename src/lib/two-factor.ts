import "server-only";
import { authenticator } from "otplib";
import QRCode from "qrcode";

authenticator.options = { window: 1 }; // تسامح ±30 ثانية

export const APP_NAME = "عيادة المغازي";

export function generateSecret(): string {
  return authenticator.generateSecret();
}

export function buildOtpAuthUri(email: string, secret: string): string {
  return authenticator.keyuri(email, APP_NAME, secret);
}

export async function toQrDataUrl(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, {
    margin: 1,
    width: 240,
    color: { dark: "#1f2b28", light: "#ffffff" },
  });
}

export function verifyToken(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token: token.replace(/\s+/g, ""), secret });
  } catch {
    return false;
  }
}
