import { prisma } from '../../lib/prisma';
import { UpdateProfileInput } from './user.schema';

export class UserError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'UserError';
  }
}

/**
 * Transforms full name into privacy-safe FirstName + LastNameInitial
 * Requirement: BR-PRIVACY-001 (e.g. "John Doe" -> "John D.")
 */
export function formatPrivacyName(fullName: string): string {
  if (!fullName || typeof fullName !== 'string') return 'Member';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const firstName = parts[0];
  const lastNameInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${firstName} ${lastNameInitial}.`;
}

export class UserService {
  /**
   * Fetches personal member profile
   * Requirement: USER-001, MEMBER-002
   */
  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        gym: {
          select: {
            id: true,
            name: true,
            code: true,
            slug: true,
            address: true,
            phone: true,
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
                price: true,
                durationDays: true,
              },
            },
          },
        },
        dietAssignments: {
          include: {
            dietPlan: {
              include: {
                dietItems: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UserError(404, 'User profile not found');
    }

    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Updates personal member profile fields (Strict allowlist: name, profilePicUrl, fitnessGoal)
   * Requirement: MEMBER-002
   */
  static async updateProfile(userId: string, input: UpdateProfileInput) {
    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      throw new UserError(404, 'User profile not found');
    }

    const updateData: Record<string, any> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.profilePicUrl !== undefined) updateData.profilePicUrl = input.profilePicUrl;
    if (input.fitnessGoal !== undefined) updateData.fitnessGoal = input.fitnessGoal;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    const { passwordHash, ...safeUser } = updatedUser;
    return safeUser;
  }

  /**
   * Returns privacy-sanitized, tenant-scoped community leaderboard
   * Requirement: MEMBER-001, BR-PRIVACY-001
   */
  static async getCommunityLeaderboard(gymId: string) {
    // MANDATORY TENANT SCOPING: Filter strictly by authenticated user's gymId
    const members = await prisma.user.findMany({
      where: {
        gymId: gymId,
      },
      select: {
        id: true,
        name: true,
        profilePicUrl: true,
        currentStreak: true,
        starScore: true,
      },
      orderBy: [{ currentStreak: 'desc' }, { starScore: 'desc' }, { createdAt: 'asc' }],
    });

    // PRIVACY TRANSFORMATION: Format name to FirstName + LastNameInitial
    return members.map((member) => ({
      id: member.id,
      name: formatPrivacyName(member.name),
      profilePicUrl: member.profilePicUrl,
      currentStreak: member.currentStreak,
      starScore: member.starScore,
    }));
  }
}
