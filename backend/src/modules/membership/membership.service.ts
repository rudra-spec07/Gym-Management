import { prisma } from '../../lib/prisma';
import { MembershipStatus } from '@prisma/client';
import {
  CreatePlanInput,
  UpdatePlanInput,
  AssignMembershipInput,
  CancelMembershipInput,
} from './membership.schema';

export class MembershipError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: string = 'MEMBERSHIP_ERROR'
  ) {
    super(message);
    this.name = 'MembershipError';
  }
}

export class MembershipService {
  /**
   * Helper: Synchronize membership status based on end date (BR-MEMBERSHIP-EXPIRING-SOON-001)
   */
  static async syncMembershipStatus(membership: any, tx?: any): Promise<any> {
    if (!membership || membership.status === 'CANCELLED' || membership.status === 'EXPIRED') {
      return membership;
    }

    const db = tx || prisma;
    const now = new Date();
    const endDate = new Date(membership.endDate);
    const msDiff = endDate.getTime() - now.getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    let targetStatus: MembershipStatus = membership.status;

    if (now > endDate) {
      targetStatus = 'EXPIRED';
    } else if (msDiff <= sevenDaysMs) {
      targetStatus = 'EXPIRING_SOON';
    }

    if (targetStatus !== membership.status) {
      const updated = await db.membership.update({
        where: { id: membership.id },
        data: { status: targetStatus },
        include: {
          plan: {
            select: {
              id: true,
              name: true,
              price: true,
              durationDays: true,
            },
          },
        },
      });
      return updated;
    }

    return membership;
  }

  /**
   * MEMBERSHIP-001: Create Membership Plan (Admin only)
   */
  static async createPlan(adminUserId: string, gymId: string, input: CreatePlanInput) {
    const plan = await prisma.membershipPlan.create({
      data: {
        gymId,
        name: input.name,
        description: input.description || null,
        durationDays: input.durationDays,
        price: input.price,
        benefits: input.benefits || [],
        isActive: input.isActive ?? true,
      },
    });

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          adminId: adminUserId,
          action: 'MEMBERSHIP_PLAN_CREATED',
          targetId: plan.id,
          reason: `Created plan: ${plan.name} (${plan.durationDays} days @ ₹${plan.price})`,
        },
      });
    } catch (err) {
      // Non-fatal logging fallback
    }

    return plan;
  }

  /**
   * MEMBERSHIP-001: List Membership Plans for tenant gym
   */
  static async getPlans(gymId: string, includeInactive: boolean = false) {
    const whereCondition: any = { gymId };
    if (!includeInactive) {
      whereCondition.isActive = true;
    }

    return prisma.membershipPlan.findMany({
      where: whereCondition,
      orderBy: { price: 'asc' },
    });
  }

  /**
   * MEMBERSHIP-001: Get single Membership Plan details
   */
  static async getPlanById(gymId: string, planId: string) {
    const plan = await prisma.membershipPlan.findFirst({
      where: {
        id: planId,
        gymId, // Mandatory Tenant Isolation
      },
    });

    if (!plan) {
      throw new MembershipError(404, 'Membership plan not found', 'NOT_FOUND');
    }

    return plan;
  }

  /**
   * MEMBERSHIP-001: Update Membership Plan (Admin only)
   */
  static async updatePlan(
    adminUserId: string,
    gymId: string,
    planId: string,
    input: UpdatePlanInput
  ) {
    // Tenant Isolation Check
    const existing = await prisma.membershipPlan.findFirst({
      where: { id: planId, gymId },
    });

    if (!existing) {
      throw new MembershipError(404, 'Membership plan not found in tenant scope', 'NOT_FOUND');
    }

    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.durationDays !== undefined) updateData.durationDays = input.durationDays;
    if (input.price !== undefined) updateData.price = input.price;
    if (input.benefits !== undefined) updateData.benefits = input.benefits;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    const updatedPlan = await prisma.membershipPlan.update({
      where: { id: planId },
      data: updateData,
    });

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          adminId: adminUserId,
          action: 'MEMBERSHIP_PLAN_UPDATED',
          targetId: planId,
          reason: `Updated plan parameters: ${Object.keys(updateData).join(', ')}`,
        },
      });
    } catch (err) {
      // Non-fatal audit fallback
    }

    return updatedPlan;
  }

  /**
   * MEMBERSHIP-002: Assign Membership Plan to Member (Admin only)
   */
  static async assignMembership(
    adminUserId: string,
    gymId: string,
    input: AssignMembershipInput
  ) {
    // 1. Tenant Isolation & Target Member Validation
    const targetUser = await prisma.user.findFirst({
      where: {
        id: input.userId,
        gymId, // Must belong to admin's gym!
      },
    });

    if (!targetUser) {
      throw new MembershipError(
        403,
        'Member not found in your gym tenant scope',
        'FORBIDDEN'
      );
    }

    // 2. Validate Membership Plan
    const plan = await prisma.membershipPlan.findFirst({
      where: {
        id: input.planId,
        gymId, // Must belong to admin's gym!
      },
    });

    if (!plan) {
      throw new MembershipError(404, 'Membership plan not found in tenant scope', 'NOT_FOUND');
    }

    if (!plan.isActive) {
      throw new MembershipError(
        400,
        'Cannot assign an inactive membership plan',
        'INACTIVE_PLAN'
      );
    }

    // 3. Calculate Deterministic Dates
    const startDate = input.startDate ? new Date(input.startDate) : new Date();
    const endDate = new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

    // 4. Atomic Membership Creation & Status Transition Transaction
    const membership = await prisma.$transaction(async (tx) => {
      // Supersede any active/expiring memberships for this user
      await tx.membership.updateMany({
        where: {
          gymId,
          userId: input.userId,
          status: { in: ['ACTIVE', 'EXPIRING_SOON'] },
        },
        data: {
          status: 'CANCELLED',
        },
      });

      // Create new Membership
      const newMembership = await tx.membership.create({
        data: {
          gymId,
          userId: input.userId,
          planId: plan.id,
          startDate,
          endDate,
          status: 'ACTIVE',
        },
        include: {
          plan: {
            select: {
              id: true,
              name: true,
              price: true,
              durationDays: true,
            },
          },
        },
      });

      // Update User status from PENDING_MEMBERSHIP -> ACTIVE if needed
      if (targetUser.status === 'PENDING_MEMBERSHIP') {
        await tx.user.update({
          where: { id: input.userId },
          data: { status: 'ACTIVE' },
        });
      }

      // Audit Log
      try {
        await tx.auditLog.create({
          data: {
            adminId: adminUserId,
            action: 'MEMBERSHIP_ASSIGNED',
            targetId: newMembership.id,
            reason: `Assigned plan ${plan.name} to member ${targetUser.name}`,
          },
        });
      } catch (err) {
        // Non-fatal audit fallback
      }

      return newMembership;
    });

    return membership;
  }

  /**
   * MEMBERSHIP-002: Get Authenticated Member's Own Memberships
   */
  static async getMyMemberships(userId: string, gymId: string) {
    const rawMemberships = await prisma.membership.findMany({
      where: {
        userId,
        gymId, // Tenant isolation
      },
      orderBy: { endDate: 'desc' },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            price: true,
            durationDays: true,
            benefits: true,
          },
        },
      },
    });

    // Evaluate expiry transitions dynamically
    const memberships = await Promise.all(
      rawMemberships.map((m) => MembershipService.syncMembershipStatus(m))
    );

    const activeMembership = memberships.find(
      (m) => m.status === 'ACTIVE' || m.status === 'EXPIRING_SOON'
    ) || null;

    return {
      activeMembership,
      memberships,
    };
  }

  /**
   * MEMBERSHIP-002: Get Member Memberships (Admin view)
   */
  static async getMemberMemberships(adminGymId: string, targetUserId: string) {
    // Tenant check
    const targetUser = await prisma.user.findFirst({
      where: { id: targetUserId, gymId: adminGymId },
    });

    if (!targetUser) {
      throw new MembershipError(403, 'Member not found in your gym tenant scope', 'FORBIDDEN');
    }

    const rawMemberships = await prisma.membership.findMany({
      where: {
        userId: targetUserId,
        gymId: adminGymId,
      },
      orderBy: { endDate: 'desc' },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            price: true,
            durationDays: true,
          },
        },
      },
    });

    const memberships = await Promise.all(
      rawMemberships.map((m) => MembershipService.syncMembershipStatus(m))
    );

    return memberships;
  }

  /**
   * MEMBERSHIP-002: Cancel Membership (Admin only)
   */
  static async cancelMembership(
    adminUserId: string,
    adminGymId: string,
    membershipId: string,
    input?: CancelMembershipInput
  ) {
    const existing = await prisma.membership.findFirst({
      where: { id: membershipId, gymId: adminGymId },
    });

    if (!existing) {
      throw new MembershipError(404, 'Membership record not found in tenant scope', 'NOT_FOUND');
    }

    if (existing.status === 'CANCELLED') {
      throw new MembershipError(400, 'Membership is already cancelled', 'INVALID_STATUS');
    }

    const updated = await prisma.membership.update({
      where: { id: membershipId },
      data: { status: 'CANCELLED' },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            price: true,
            durationDays: true,
          },
        },
      },
    });

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          adminId: adminUserId,
          action: 'MEMBERSHIP_CANCELLED',
          targetId: membershipId,
          reason: input?.reason || 'Admin cancelled membership',
        },
      });
    } catch (err) {
      // Non-fatal audit fallback
    }

    return updated;
  }
}
