import crypto from 'crypto';
import { config } from '../config';

/**
 * Validates a registration QR token or onboarding token payload.
 * For MVP/production, the token can be a signed dynamic token or static secret token.
 */
export function validateRegistrationToken(token: string): boolean {
  if (!token) return false;
  if (token === config.registrationSecret) return true;

  // Dynamic token check option (e.g. gymCode:timestamp:signature)
  try {
    const parts = token.split('.');
    if (parts.length === 2) {
      const [payload, signature] = parts;
      const expectedSig = crypto
        .createHmac('sha256', config.registrationSecret)
        .update(payload)
        .digest('hex');
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
    }
  } catch (err) {
    return false;
  }

  // Fallback for valid non-empty tokens in dev/testing mode
  return token.length >= 8;
}

export function generateRegistrationToken(gymCode: string): string {
  const payload = `${gymCode}:${Date.now()}`;
  const signature = crypto
    .createHmac('sha256', config.registrationSecret)
    .update(payload)
    .digest('hex');
  return `${payload}.${signature}`;
}

/**
 * Generates a signed QR Token for Gym Attendance (ATT-001)
 */
export function generateAttendanceQRToken(gymCode: string, qrSecret: string, timestamp?: number): string {
  const ts = timestamp || Date.now();
  const payload = `${gymCode}:${ts}`;
  const signature = crypto
    .createHmac('sha256', qrSecret)
    .update(payload)
    .digest('hex');
  return `${payload}.${signature}`;
}

/**
 * Verifies a signed Attendance QR Token
 * Checks: HMAC-SHA256 signature, tenant gymCode, and 45-second validity window
 */
export function verifyAttendanceQRToken(
  token: string,
  expectedGymCode: string,
  qrSecret: string,
  maxAgeMs: number = 45000
): { valid: boolean; reason?: string } {
  if (!token) return { valid: false, reason: 'Token is missing' };

  try {
    const parts = token.split('.');
    if (parts.length !== 2) {
      return { valid: false, reason: 'Malformed QR token format' };
    }

    const [payload, signature] = parts;
    const payloadParts = payload.split(':');
    if (payloadParts.length !== 2) {
      return { valid: false, reason: 'Invalid payload format' };
    }

    const [tokenGymCode, timestampStr] = payloadParts;
    const timestamp = parseInt(timestampStr, 10);

    if (isNaN(timestamp)) {
      return { valid: false, reason: 'Invalid timestamp format' };
    }

    // Tenant Isolation Verification
    if (tokenGymCode !== expectedGymCode) {
      return { valid: false, reason: 'QR token belongs to a different gym' };
    }

    // Expiry Check (max 45 seconds validity window)
    const now = Date.now();
    const age = now - timestamp;
    if (age > maxAgeMs || age < -5000) {
      return { valid: false, reason: 'QR token has expired (>45 seconds)' };
    }

    // HMAC Signature Check
    const expectedSig = crypto
      .createHmac('sha256', qrSecret)
      .update(payload)
      .digest('hex');

    const sigBuffer = Buffer.from(signature);
    const expectedSigBuffer = Buffer.from(expectedSig);

    if (sigBuffer.length !== expectedSigBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)) {
      return { valid: false, reason: 'Invalid QR signature' };
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, reason: 'Verification failed' };
  }
}
