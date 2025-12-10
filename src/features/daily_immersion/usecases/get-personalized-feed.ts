import { ImmersionRepository } from '../domain/interface/immersion-repository';
import { VideoHarvestingService } from '../domain/interface/video-harvesting-service';
import { ImmersionShort } from '../domain/entities/immersion-short';

export interface GetPersonalizedFeedInput {
    userId: string;
    category?: string; // Optional, defaults to 'mix'
    limit?: number;    // Optional, defaults to 10
}

export class GetPersonalizedFeedUseCase {
    constructor(
        private readonly immersionRepository: ImmersionRepository,
        // ADDED DEPENDENCY: We need this to fetch from YouTube if DB is empty
        private readonly harvestingService: VideoHarvestingService
    ) { }

    async execute(input: GetPersonalizedFeedInput): Promise<ImmersionShort[]> {
        const category = input.category || 'mix';
        const limit = input.limit || 10;

        console.log(`👉 Fetching feed for user ${input.userId} (Category: ${category})...`);

        // 1. Try to get videos from the Database first
        let shorts = await this.immersionRepository.getPersonalizedFeed(
            input.userId,
            category,
            limit
        );

        // 2. CHECK: Is the DB empty?
        if (shorts.length === 0) {
            console.warn(`⚠️ DB is empty for '${category}'. Triggering Lazy Harvest...`);

            // 3. FALLBACK: Fetch from YouTube immediately
            // If category is 'mix', we pick a random category to harvest
            const harvestCategory = category === 'mix' ? 'funny' : category;

            try {
                const freshShorts = await this.harvestingService.harvestByCategory(harvestCategory);

                if (freshShorts.length > 0) {
                    // 4. Save them to DB so next time it's fast
                    await this.immersionRepository.saveBatch(freshShorts);

                    console.log(`✅ Lazy Harvest successful. Returning ${freshShorts.length} fresh videos.`);
                    return freshShorts;
                }
            } catch (error) {
                console.error(`❌ Lazy Harvest failed:`, error);
                // If even YouTube fails, return empty array (avoids app crash)
                return [];
            }
        } else {
            console.log(`✅ Found ${shorts.length} videos in DB.`);
        }

        return shorts;
    }
}