import { prisma } from '../../lib/prisma';
import { hashPassword, comparePassword } from '../../lib/password';
import { signSessionToken, TokenPayload } from '../../lib/jwt';
import { validateRegistrationToken } from '../../lib/token';
import { RegisterInput, LoginInput } from './auth.schema';

export class AuthError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export class AuthService {
  /**
   * Registers a new gym member via QR Onboarding Token
   * Requirement: AUTH-001, BR-REG-001, BR-REG-002
   */
  static async register(input: RegisterInput) {
    // 1. Validate Registration Token
    const isValidToken = validateRegistrationToken(input.token);
    if (!isValidToken) {
      throw new AuthError(400, 'Invalid or expired registration QR onboarding token');
    }

    // 2. Find Gym Tenant by Gym Code
    let gym = await prisma.gym.findUnique({
      where: { code: input.gymCode },
    });

    // Dev/Test helper: Create default gym if not present
    if (!gym) {
      gym = await prisma.gym.create({
        data: {
          name: 'Main Fitness Center',
          slug: input.gymCode.toLowerCase(),
          code: input.gymCode,
          qrSecret: 'default-qr-secret-2026',
        },
      });
    }

    // 3. Check for existing user by Email or Phone within the Gym
    const existingUser = await prisma.user.findFirst({
      where: {
        gymId: gym.id,
        OR: [{ email: input.email }, { phone: input.phone }],
      },
    });

    if (existingUser) {
      if (existingUser.email === input.email) {
        throw new AuthError(400, 'Account already exists with this email address. Please log in.');
      }
      throw new AuthError(400, 'Account already exists with this mobile number. Please log in.');
    }

    // 4. Hash Password
    const passwordHash = await hashPassword(input.password);

    // 5. Create User Record with status PENDING_MEMBERSHIP (BR-REG-002)
    const newUser = await prisma.user.create({
      data: {
        gymId: gym.id,
        email: input.email,
        phone: input.phone,
        name: input.name,
        passwordHash,
        role: 'MEMBER',
        status: 'PENDING_MEMBERSHIP',
        fitnessGoal: input.fitnessGoal || null,
        currentStreak: 0,
        longestStreak: 0,
        starScore: 0,
      },
    });

    // 6. Generate Session JWT Token
    const tokenPayload: TokenPayload = {
      userId: newUser.id,
      gymId: gym.id,
      role: newUser.role as 'SUPER_ADMIN' | 'GYM_ADMIN' | 'MEMBER',
      email: newUser.email,
    };

    const token = signSessionToken(tokenPayload);

    return {
      user: {
        id: newUser.id,
        gymId: newUser.gymId,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        status: newUser.status,
        fitnessGoal: newUser.fitnessGoal,
      },
      token,
      redirectTo: '/user/membership/select',
    };
  }

  /**
   * Authenticates user credentials & issues session token
   * Requirement: AUTH-002
   */
  static async login(input: LoginInput) {
    let whereCondition: any = {
      OR: [{ email: input.identifier }, { phone: input.identifier }],
    };

    if (input.gymCode) {
      const gym = await prisma.gym.findUnique({
        where: { code: input.gymCode },
      });
      if (gym) {
        whereCondition.gymId = gym.id;
      }
    }

    // 1. Lookup User
    const user = await prisma.user.findFirst({
      where: whereCondition,
      include: { gym: true },
    });

    if (!user) {
      throw new AuthError(401, 'Invalid email/phone or password');
    }

    // 2. Validate Password
    const isPasswordValid = await comparePassword(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AuthError(401, 'Invalid email/phone or password');
    }

    // 3. Generate Session Token
    const tokenPayload: TokenPayload = {
      userId: user.id,
      gymId: user.gymId,
      role: user.role as 'SUPER_ADMIN' | 'GYM_ADMIN' | 'MEMBER',
      email: user.email,
    };

    const token = signSessionToken(tokenPayload);

    const redirectTo =
      user.role === 'GYM_ADMIN' || user.role === 'SUPER_ADMIN'
        ? '/admin/dashboard'
        : '/user/dashboard';

    return {
      user: {
        id: user.id,
        gymId: user.gymId,
        gymCode: user.gym?.code,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        starScore: user.starScore,
      },
      token,
      redirectTo,
    };
  }

  /**
   * Validates an onboarding QR token and returns dynamic Gym tenant metadata
   * Gap Fix #1: Enables dynamic registration page rendering without hardcoding
   */
  static async verifyRegistrationToken(token: string, gymCode?: string) {
    const isValidToken = validateRegistrationToken(token);
    if (!isValidToken) {
      throw new AuthError(400, 'Invalid or expired registration QR onboarding token');
    }

    let gym = null;
    if (gymCode) {
      gym = await prisma.gym.findUnique({
        where: { code: gymCode },
        select: {
          id: true,
          name: true,
          code: true,
          slug: true,
          address: true,
          phone: true,
        },
      });
    }

    if (!gym) {
      // Return default gym metadata or first active gym
      gym = await prisma.gym.findFirst({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          code: true,
          slug: true,
          address: true,
          phone: true,
        },
      });
    }

    return {
      valid: true,
      gym,
    };
  }

  /**
   * Resolves public Gym metadata by Gym Code
   * Gap Fix #2: Dynamic public tenant lookup
   */
  static async getPublicGymByCode(code: string) {
    const gym = await prisma.gym.findUnique({
      where: { code },
      select: {
        id: true,
        name: true,
        code: true,
        slug: true,
        address: true,
        phone: true,
        isActive: true,
      },
    });

    if (!gym || !gym.isActive) {
      throw new AuthError(404, 'Gym tenant not found or inactive');
    }

    return gym;
  }

  /**
   * Fetches user profile for authenticated session including active membership summary
   * Gap Fix #3: Navigation & Auth Middleware guard payload
   */
  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        gym: {
          select: {
            id: true,
            name: true,
            code: true,
            slug: true,
          },
        },
        memberships: {
          where: {
            status: { in: ['ACTIVE', 'EXPIRING_SOON'] },
          },
          orderBy: { endDate: 'desc' },
          take: 1,
          include: {
            plan: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AuthError(404, 'User session invalid or user not found');
    }

    const memberships = user.memberships || [];
    const activeMembership = memberships.length > 0 ? memberships[0] : null;

    return {
      id: user.id,
      gymId: user.gymId,
      gym: user.gym,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      starScore: user.starScore,
      hasActiveMembership: !!activeMembership,
      activeMembership: activeMembership
        ? {
            id: activeMembership.id,
            planId: activeMembership.planId,
            planName: activeMembership.plan.name,
            status: activeMembership.status,
            startDate: activeMembership.startDate,
            endDate: activeMembership.endDate,
          }
        : null,
      createdAt: user.createdAt,
    };
  }
}
