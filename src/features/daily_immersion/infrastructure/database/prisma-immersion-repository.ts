import { PrismaClient, LearningShort, UserShortHistory } from '@prisma/client';
import { ImmersionRepository } from '../../domain/interface/immersion-repository';
import { ImmersionShort } from '../../domain/entities/immersion-short';

export class PrismaImmersionRepository implements ImmersionRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async saveBatch(shorts: ImmersionShort[]): Promise<void> {
        console.log(`💾 Repo: Attempting to save batch of ${shorts.length} shorts...`);
        await this.prisma.$transaction(
            shorts.map(short =>
                this.prisma.learningShort.upsert({
                    where: { youtubeId: short.youtubeId },
                    update: {
                        title: short.title,
                        description: short.description,
                        thumbnailUrl: short.thumbnailUrl
                    },
                    create: {
                        youtubeId: short.youtubeId,
                        title: short.title,
                        description: short.description,
                        thumbnailUrl: short.thumbnailUrl,
                        channelName: short.channelName,
                        difficultyLevel: short.difficulty,
                        category: short.category,
                    }
                })
            )
        );
        console.log(`✅ Repo: Batch save complete.`);
    }

    async existsByYoutubeId(youtubeId: string): Promise<boolean> {
        const count = await this.prisma.learningShort.count({
            where: { youtubeId: youtubeId }
        });
        return count > 0;
    }

    /**
     * UPDATED: Fetches unwatched videos ONLY.
     * 
     * 🚨 FIX APPLIED: Removed the logic that automatically marked videos as watched.
     * The Frontend is now responsible for calling 'markAsWatched' when the user
     * actually scrolls past the video.
     */
    async getPersonalizedFeed(userId: string, category: string, limit: number): Promise<ImmersionShort[]> {
        // 1. Build the Where Clause (Filter out videos the user has already watched)
        const whereClause: any = {
            watchedBy: {
                none: { userId: userId }
            }
        };

        if (category !== 'mix') {
            whereClause.category = category;
        }

        // 2. Fetch from DB
        const rawShorts = await this.prisma.learningShort.findMany({
            where: whereClause,
            take: limit,
            // Optimization: In the future, you can use raw SQL for random ordering.
            // For now, sorting by newest ensures freshness.
            orderBy: { createdAt: 'desc' },
        });

        // 3. Check which of these are "Saved" (Liked) by the user
        // We need this to show the correct "Heart" icon state on the UI.
        const videoIds = rawShorts.map(s => s.id);
        let savedSet = new Set<string>();

        if (videoIds.length > 0) {
            const savedRecords = await this.prisma.userShortHistory.findMany({
                where: {
                    userId: userId,
                    shortId: { in: videoIds },
                    isSaved: true
                },
                select: { shortId: true }
            });

            savedSet = new Set(savedRecords.map(r => r.shortId));
        }

        // 4. Map to Domain
        return rawShorts.map(raw => this.mapToDomain(raw, savedSet.has(raw.id)));
    }

    /**
     * This is called by your 'MarkWatchedUseCase' when the frontend 
     * sends the signal that a video was finished/scrolled.
     */
    async markAsWatched(userId: string, shortId: string): Promise<void> {
        try {
            await this.prisma.userShortHistory.upsert({
                where: { userId_shortId: { userId, shortId } },
                // If it exists, just update the timestamp (user re-watched it)
                update: { watchedAt: new Date() },
                // If not, create a new record
                create: {
                    userId,
                    shortId,
                    watchedAt: new Date(),
                    isSaved: false
                }
            });
            // console.log(`👀 Marked video ${shortId} as watched for user ${userId}`);
        } catch (error) {
            console.error(`Failed to mark video ${shortId} as watched:`, error);
        }
    }

    async toggleSave(userId: string, shortId: string): Promise<boolean> {
        // Check current status
        const history = await this.prisma.userShortHistory.findUnique({
            where: { userId_shortId: { userId, shortId } }
        });

        let newStatus = true;

        if (history) {
            // Toggle existing
            newStatus = !history.isSaved;
            await this.prisma.userShortHistory.update({
                where: { userId_shortId: { userId, shortId } },
                data: { isSaved: newStatus }
            });
        } else {
            // Create new (Saving implicitly means they watched it)
            await this.prisma.userShortHistory.create({
                data: {
                    userId,
                    shortId,
                    isSaved: true,
                    watchedAt: new Date()
                }
            });
        }
        return newStatus;
    }

    async getSavedShorts(userId: string): Promise<ImmersionShort[]> {
        const history = await this.prisma.userShortHistory.findMany({
            where: { userId: userId, isSaved: true },
            include: { short: true },
            orderBy: { watchedAt: 'desc' }
        });
        return history.map(h => this.mapToDomain(h.short, true));
    }

    private mapToDomain(raw: LearningShort, isSaved: boolean): ImmersionShort {
        return new ImmersionShort(
            raw.id,
            raw.youtubeId,
            raw.title,
            raw.description || "",
            raw.thumbnailUrl || "",
            raw.channelName || "",
            raw.difficultyLevel as 'beginner' | 'intermediate' | 'advanced',
            raw.category as 'funny' | 'real_life' | 'motivation' | 'culture' | 'mix',
            isSaved,
            false // 👈 IMPORTANT: Default isWatched to FALSE. The Frontend determines when it becomes true.
        );
    }
}