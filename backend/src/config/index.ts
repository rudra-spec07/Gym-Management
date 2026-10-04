import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'fallback-super-secret-jwt-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  registrationSecret: process.env.REGISTRATION_SECRET || 'gym-qr-reg-secret-2026',
  cookieSecret: process.env.COOKIE_SECRET || 'fallback-cookie-secret',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_key_id',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_mock_secret_key',
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_test_webhook_secret',
};
