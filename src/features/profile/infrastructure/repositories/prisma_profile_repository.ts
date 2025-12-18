import { PrismaClient } from '@prisma/client';
import { ProfileRepository, RawUserStats } from '../../domain/interfaces/profile_repository';

export class PrismaProfileRepository implements ProfileRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async getUserWithStats(userId: string): Promise<RawUserStats | null> {
        // We use Prisma's 'select' to fetch only what we need for the tree logic
        // plus the _count relation to get the number of stories/shorts efficiently.
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                fullName: true,
                avatarUrl: true,
                currentStreak: true,
                lastActiveDate: true,
                createdAt: true,
                _count: {
                    select: {
                        completedStories: true,
                        watchedShorts: true
                    }
                }
            }
        });

        return user;
    }

    async updateIdentity(userId: string, fullName?: string, avatarUrl?: string): Promise<void> {
        // Build a dynamic object to only update fields that are provided (not undefined)
        const dataToUpdate: any = {};
        if (fullName) dataToUpdate.fullName = fullName;
        if (avatarUrl) dataToUpdate.avatarUrl = avatarUrl;

        if (Object.keys(dataToUpdate).length === 0) {
            return; // Nothing to update
        }

        await this.prisma.user.update({
            where: { id: userId },
            data: dataToUpdate
        });
    }
}