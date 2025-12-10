import { PrismaClient, LearningShort, UserShortHistory } from '@prisma/client';
import { ImmersionRepository } from '../../domain/interface/immersion-repository';
import { ImmersionShort } from '../../domain/entities/immersion-short';

export class PrismaImmersionRepository implements ImmersionRepository {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Efficiently saves a batch of videos, ignoring duplicates.
     */
    async saveBatch(shorts: ImmersionShort[]): Promise<void> {
        console.log(`💾 Repo: Attempting to save batch of ${shorts.length} shorts...`);

        // We use a transaction to ensure data integrity
        await this.prisma.$transaction(
            shorts.map(short =>
                this.prisma.learningShort.upsert({
                    where: { youtubeId: short.youtubeId },
                    update: {
                        // If it exists, we just update metadata that might have changed
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
     * The Core Algorithm: Fetches random unwatched videos for the feed.
     */
    async getPersonalizedFeed(userId: string, category: string, limit: number): Promise<ImmersionShort[]> {
        // 1. Build the Where Clause
        // We want videos that are NOT in the UserShortHistory for this user
        const whereClause: any = {
            watchedBy: {
                none: { userId: userId }
            }
        };

        // If category is specific (not 'mix'), filter by it
        if (category !== 'mix') {
            whereClause.category = category;
        }

        // 2. Fetch from DB
        // Prisma doesn't do "ORDER BY RANDOM()" well, so we use a raw query logic 
        // or a native Prisma approach. For a student project, Prisma's standard 
        // approach is cleaner, even if slightly less "random" than raw SQL.

        const rawShorts = await this.prisma.learningShort.findMany({
            where: whereClause,
            take: limit,
            // We order by createdAt desc to show newest content first
            // (In a real startup, you'd swap this for Raw SQL to get true randomness)
            orderBy: { createdAt: 'desc' },
        });

        // 3. Check which of these are "Saved" by the user
        // We need a second query to see if the user has 'liked' any of these specific IDs
        const videoIds = rawShorts.map(s => s.id);
        const savedRecords = await this.prisma.userShortHistory.findMany({
            where: {
                userId: userId,
                shortId: { in: videoIds },
                isSaved: true
            },
            select: { shortId: true }
        });

        const savedSet = new Set(savedRecords.map(r => r.shortId));

        // 4. Map to Domain
        return rawShorts.map(raw => this.mapToDomain(raw, savedSet.has(raw.id)));
    }

    async markAsWatched(userId: string, shortId: string): Promise<void> {
        try {
            await this.prisma.userShortHistory.upsert({
                where: {
                    userId_shortId: { userId, shortId }
                },
                update: { watchedAt: new Date() }, // Update timestamp if they watch again
                create: {
                    userId,
                    shortId,
                    watchedAt: new Date(),
                    isSaved: false
                }
            });
        } catch (error) {
            console.error("Failed to mark video as watched", error);
        }
    }

    async toggleSave(userId: string, shortId: string): Promise<boolean> {
        // First check if a history record exists
        const history = await this.prisma.userShortHistory.findUnique({
            where: { userId_shortId: { userId, shortId } }
        });

        let newStatus = true;

        if (history) {
            newStatus = !history.isSaved;
            await this.prisma.userShortHistory.update({
                where: { userId_shortId: { userId, shortId } },
                data: { isSaved: newStatus }
            });
        } else {
            // Create new record as saved
            await this.prisma.userShortHistory.create({
                data: {
                    userId,
                    shortId,
                    isSaved: true,
                    watchedAt: new Date() // Saving implies they saw it
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

    // --- HELPER: Map Prisma Data to Domain Entity ---
    private mapToDomain(raw: LearningShort, isSaved: boolean): ImmersionShort {
        return new ImmersionShort(
            raw.id,
            raw.youtubeId,
            raw.title,
            raw.description || "",
            raw.thumbnailUrl || "",
            raw.channelName || "",
            // We cast string to literal type safely
            raw.difficultyLevel as 'beginner' | 'intermediate' | 'advanced',
            raw.category as 'funny' | 'real_life' | 'motivation' | 'culture' | 'mix',
            isSaved,
            false // isWatched (handled by logic outside)
        );
    }
}