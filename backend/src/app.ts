import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { authRouter } from './modules/auth/auth.router';
import { userRouter } from './modules/user/user.router';
import { attendanceRouter } from './modules/attendance/attendance.router';
import { membershipRouter } from './modules/membership/membership.router';
import { paymentRouter } from './modules/payment/payment.router';
import { errorHandler } from './middleware/error.middleware';

export const app = express();

// Global Middlewares
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
);

// Capture raw body for Razorpay webhook HMAC verification
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(config.cookieSecret));

// Healthcheck Route
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/membership', membershipRouter);
app.use('/api/payment', paymentRouter);

// Global Error Handler
app.use(errorHandler);
