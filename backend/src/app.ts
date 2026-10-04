import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { authRouter } from './modules/auth/auth.router';
import { userRouter } from './modules/user/user.router';
import { attendanceRouter } from './modules/attendance/attendance.router';
import { errorHandler } from './middleware/error.middleware';

export const app = express();

// Global Middlewares
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
);
app.use(express.json());
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

// Global Error Handler
app.use(errorHandler);
