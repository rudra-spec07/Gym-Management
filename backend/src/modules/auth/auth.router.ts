import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticateSession } from '../../middleware/auth.middleware';

export const authRouter = Router();

authRouter.post('/register', AuthController.register);
authRouter.post('/login', AuthController.login);
authRouter.post('/logout', AuthController.logout);
authRouter.get('/verify-token', AuthController.verifyToken);
authRouter.get('/gyms/:code', AuthController.getPublicGym);
authRouter.get('/me', authenticateSession, AuthController.me);
