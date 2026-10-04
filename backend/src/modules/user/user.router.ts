import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticateSession } from '../../middleware/auth.middleware';

export const userRouter = Router();

userRouter.get('/profile', authenticateSession, UserController.getProfile);
userRouter.patch('/profile', authenticateSession, UserController.updateProfile);
userRouter.put('/profile', authenticateSession, UserController.updateProfile);
userRouter.get('/community', authenticateSession, UserController.getCommunity);
