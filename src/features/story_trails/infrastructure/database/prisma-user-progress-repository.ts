import { PrismaClient } from '@prisma/client';
import { UserProgressRepository } from '../../domain/interface/user-progress-repository';

export class PrismaUserProgressRepository implements UserProgressRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async markStoryAsCompleted(userId: string, trailId: string): Promise<boolean> {
        try {
            await this.prisma.completedStory.create({
                data: {
                    userId: userId,
                    storyId: trailId,
                },
            });
            // If creation succeeds, it's the first time, so return true.
            return true;
        } catch (error) {
            // Prisma throws an error on unique constraint violation (if record already exists)
            // You should check for the specific error code (P2002) for robustness.
            return false;
        }
    }

    async getCompletedStoryCountForLevel(userId: string, level: number): Promise<number> {
        return this.prisma.completedStory.count({
            where: {
                userId: userId,
                story: {
                    difficultyLevel: level,
                },
            },
        });
    }
}