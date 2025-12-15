import { ImmersionRepository } from '../domain/interface/immersion-repository';
import { VideoHarvestingService } from '../domain/interface/video-harvesting-service';
import { ImmersionShort } from '../domain/entities/immersion-short';

export interface GetPersonalizedFeedInput {
    userId: string;
    category?: string; // We will treat this loosely now
    limit?: number;
}

export class GetPersonalizedFeedUseCase {
    // A list of all valid categories we want to rotate through
    private readonly harvestCategories = ['funny', 'real_life', 'motivation', 'culture'];

    constructor(
        private readonly immersionRepository: ImmersionRepository,
        private readonly harvestingService: VideoHarvestingService
    ) { }

    async execute(input: GetPersonalizedFeedInput): Promise<ImmersionShort[]> {
        // Force 'mix' logic generally, but respect input if specifically requested
        const category = input.category || 'mix';
        const limit = input.limit || 10;

        console.log(`👉 Fetching feed for user ${input.userId} (Mode: ${category})...`);

        // 1. Try to get videos from the Database first
        // The Repository implementation of 'getPersonalizedFeed' should already handle randomization
        let shorts = await this.immersionRepository.getPersonalizedFeed(
            input.userId,
            category,
            limit
        );

        // 2. CHECK: Is the DB empty (or did we get fewer videos than requested)?
        if (shorts.length < limit) {
            console.warn(`⚠️ DB Low/Empty (Found ${shorts.length}). Triggering Random Lazy Harvest...`);

            // 3. FALLBACK: Randomize the Harvest
            // Instead of always fetching 'funny', we pick a random one from our list.
            // This ensures the DB gets filled with variety over time.
            const randomCategory = this.harvestCategories[Math.floor(Math.random() * this.harvestCategories.length)];

            console.log(`🎲 Selected Random Harvest Category: '${randomCategory}'`);

            try {
                // Harvest from YouTube
                const freshShorts = await this.harvestingService.harvestByCategory(randomCategory);

                if (freshShorts.length > 0) {
                    // 4. Save to DB
                    await this.immersionRepository.saveBatch(freshShorts);

                    // 5. CRITICAL: Don't just return the fresh ones. 
                    // Fetch from the DB *again* to ensure we get a true mix of old + new,
                    // and to respect the user's watched history.
                    shorts = await this.immersionRepository.getPersonalizedFeed(
                        input.userId,
                        category,
                        limit
                    );

                    console.log(`✅ Harvested & Refetched. Now returning ${shorts.length} videos.`);
                }
            } catch (error) {
                console.error(`❌ Lazy Harvest failed:`, error);
                // Return whatever we have (could be empty)
            }
        }

        return shorts;
    }
}