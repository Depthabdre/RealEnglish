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
     * UPDATED: Fetches unwatched videos AND immediately marks them as watched.
     */
    async getPersonalizedFeed(userId: string, category: string, limit: number): Promise<ImmersionShort[]> {
        // 1. Build the Where Clause (Filter out watched videos)
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
            orderBy: { createdAt: 'desc' }, // Or random logic if you add it later
        });

        // 3. --- NEW: AUTO-MARK AS WATCHED ---
        // We do this immediately so they don't show up in the next fetch.
        if (rawShorts.length > 0) {
            await this.prisma.$transaction(
                rawShorts.map(short =>
                    this.prisma.userShortHistory.upsert({
                        where: { userId_shortId: { userId, shortId: short.id } },
                        update: { watchedAt: new Date() }, // Update timestamp
                        create: {
                            userId,
                            shortId: short.id,
                            watchedAt: new Date(),
                            isSaved: false
                        }
                    })
                )
            );
        }

        // 4. Check which of these are "Saved" (Liked) by the user
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

        // 5. Map to Domain
        return rawShorts.map(raw => this.mapToDomain(raw, savedSet.has(raw.id)));
    }

    async markAsWatched(userId: string, shortId: string): Promise<void> {
        // This method can stay as a "manual" override if needed, 
        // but getPersonalizedFeed handles the bulk of it now.
        try {
            await this.prisma.userShortHistory.upsert({
                where: { userId_shortId: { userId, shortId } },
                update: { watchedAt: new Date() },
                create: { userId, shortId, watchedAt: new Date(), isSaved: false }
            });
        } catch (error) {
            console.error("Failed to mark video as watched", error);
        }
    }

    async toggleSave(userId: string, shortId: string): Promise<boolean> {
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
            true // --- UPDATED: Since we just marked it as watched, this is always true now
        );
    }
}