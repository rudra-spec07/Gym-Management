import { Router } from 'express';
import { authenticateSession, requireRole } from '../../middleware/auth.middleware';
import { MembershipController } from './membership.controller';

export const membershipRouter = Router();

// MEMBERSHIP-001: Plan Management
membershipRouter.post(
  '/plans',
  authenticateSession,
  requireRole(['GYM_ADMIN', 'SUPER_ADMIN']),
  MembershipController.createPlan
);

membershipRouter.get(
  '/plans',
  authenticateSession,
  MembershipController.getPlans
);

membershipRouter.get(
  '/plans/:id',
  authenticateSession,
  MembershipController.getPlanById
);

membershipRouter.patch(
  '/plans/:id',
  authenticateSession,
  requireRole(['GYM_ADMIN', 'SUPER_ADMIN']),
  MembershipController.updatePlan
);

// MEMBERSHIP-002: Subscriptions & Status
membershipRouter.post(
  '/assign',
  authenticateSession,
  requireRole(['GYM_ADMIN', 'SUPER_ADMIN']),
  MembershipController.assignMembership
);

membershipRouter.get(
  '/my-membership',
  authenticateSession,
  requireRole(['MEMBER']),
  MembershipController.getMyMemberships
);

membershipRouter.get(
  '/member/:userId',
  authenticateSession,
  requireRole(['GYM_ADMIN', 'SUPER_ADMIN']),
  MembershipController.getMemberMemberships
);

membershipRouter.post(
  '/cancel/:id',
  authenticateSession,
  requireRole(['GYM_ADMIN', 'SUPER_ADMIN']),
  MembershipController.cancelMembership
);
