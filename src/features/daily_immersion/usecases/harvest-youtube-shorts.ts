import { ImmersionRepository } from '../domain/interface/immersion-repository';
import { VideoHarvestingService } from '../domain/interface/video-harvesting-service';

export interface HarvestYouTubeShortsInput {
    category: string; // 'funny', 'real_life', etc.
}

export class HarvestYouTubeShortsUseCase {
    constructor(
        private readonly immersionRepository: ImmersionRepository,
        private readonly harvestingService: VideoHarvestingService
    ) { }

    async execute(input: HarvestYouTubeShortsInput): Promise<{ savedCount: number }> {
        console.log(`🚜 Starting Harvest for category: '${input.category}'...`);

        // 1. Fetch from External API
        const harvestedShorts = await this.harvestingService.harvestByCategory(input.category);

        if (harvestedShorts.length === 0) {
            console.log(`⚠️ Harvester returned 0 videos. Check API Quota or Search Query.`);
            return { savedCount: 0 };
        }

        // 2. Save to Database (Batch Upsert)
        console.log(`💾 Saving ${harvestedShorts.length} videos to database...`);
        await this.immersionRepository.saveBatch(harvestedShorts);

        console.log(`✅ Harvest Complete for ${input.category}.`);
        return { savedCount: harvestedShorts.length };
    }
}