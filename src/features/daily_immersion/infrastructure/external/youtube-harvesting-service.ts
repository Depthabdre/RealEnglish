import { google, youtube_v3 } from 'googleapis';
import { VideoHarvestingService } from '../../domain/interface/video-harvesting-service';
import { ImmersionShort } from '../../domain/entities/immersion-short';
import { randomUUID } from 'crypto';

// ============================================================================
// CONFIGURATION: The "Real English" Content Strategy
// ============================================================================
const SEARCH_RECIPES: Record<string, string[]> = {
    funny: [
        "relatable comedy skits english",
        "customer service skits shorts",
        "stand up comedy crowd work clean",
        "the office best moments shorts"
    ],
    real_life: [
        "day in the life vlog aesthetic voiceover",
        "street interview london nyc",
        "ordering food pov shorts",
        "asking strangers questions shorts"
    ],
    motivation: [
        "psychology facts shorts",
        "today i learned shorts",
        "simon sinek shorts",
        "steve harvey motivation shorts"
    ],
    culture: [
        "social skills tips shorts",
        "modern dating advice shorts",
        "american vs british english shorts",
        "conversation starters tips"
    ]
};

export class YouTubeHarvestingService implements VideoHarvestingService {
    private readonly youtube: youtube_v3.Youtube;

    constructor() {
        const apiKey = process.env.YOUTUBE_API_KEY;
        if (!apiKey) throw new Error('YOUTUBE_API_KEY is missing in .env file.');

        this.youtube = google.youtube({
            version: 'v3',
            auth: apiKey
        });
    }

    /**
     * Harvests a MIX of videos. 
     * Even if a specific category is requested, we ignore it to ensure diversity
     * unless we specifically want to target one (flexibility).
     */
    async harvestByCategory(requestedCategory: string): Promise<ImmersionShort[]> {
        console.log(`👉 [Harvester] Starting MIXED harvest (Targeting High Quality & Views)...`);

        // 1. Select 3 distinct categories to harvest from to ensure a "Mix"
        // (e.g., 1 Funny, 1 Motivation, 1 Culture)
        const allCategories = Object.keys(SEARCH_RECIPES);
        // Shuffle and pick 3
        const selectedCategories = allCategories.sort(() => 0.5 - Math.random()).slice(0, 3);

        const harvestPromises = selectedCategories.map(cat => this.fetchVideosForCategory(cat));

        // 2. Run requests in parallel
        const results = await Promise.all(harvestPromises);

        // 3. Flatten results into one list
        const mixedShorts = results.flat();

        // 4. Shuffle the final list so they aren't grouped by category
        const shuffledMix = mixedShorts.sort(() => 0.5 - Math.random());

        console.log(`✅ [Harvester] Harvest complete. Returning ${shuffledMix.length} mixed high-quality videos.`);
        return shuffledMix;
    }

    private async fetchVideosForCategory(category: string): Promise<ImmersionShort[]> {
        const queries = SEARCH_RECIPES[category];
        const randomQuery = queries[Math.floor(Math.random() * queries.length)];

        try {
            const response = await this.youtube.search.list({
                part: ['snippet'],
                q: randomQuery,
                type: ['video'],
                videoDuration: 'short', // Shorts only

                // --- QUALITY & FAME SETTINGS ---
                maxResults: 4,          // Fetch 4 per category (Total ~12 per harvest)
                order: 'viewCount',     // 🌟 PRIORITY: Get "Famous" videos with most views
                videoDefinition: 'high',// 🌟 PRIORITY: HD Quality only

                // --- STRICT ENGLISH SETTINGS ---
                relevanceLanguage: 'en',
                regionCode: 'US',       // Bias towards US/UK/Canada for native speakers
                safeSearch: 'strict'
            });

            const items = response.data.items || [];

            return items
                .filter(item => item.id?.videoId && item.snippet)
                .map(item => this.mapYouTubeItemToDomain(item, category));

        } catch (error) {
            console.error(`❌ [Harvester] Failed to fetch category '${category}':`, error);
            return [];
        }
    }

    private mapYouTubeItemToDomain(item: youtube_v3.Schema$SearchResult, category: string): ImmersionShort {
        const snippet = item.snippet!;
        const videoId = item.id!.videoId!;

        const rawTitle = snippet.title || "Untitled";
        const rawDesc = snippet.description || "";

        const cleanTitle = this.cleanTitle(rawTitle);

        // Auto-Detect Difficulty
        const textToCheck = (rawTitle + " " + rawDesc).toLowerCase();
        let difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate';

        if (textToCheck.includes('easy') || textToCheck.includes('basic') || textToCheck.includes('kids')) {
            difficulty = 'beginner';
        } else if (textToCheck.includes('advanced') || textToCheck.includes('native') || textToCheck.includes('fast')) {
            difficulty = 'advanced';
        }

        return new ImmersionShort(
            randomUUID(),
            videoId,
            cleanTitle,
            rawDesc,
            snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || "",
            snippet.channelTitle || "Unknown Channel",
            difficulty,
            category as any,
            false,
            false
        );
    }

    private cleanTitle(rawTitle: string): string {
        return rawTitle
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&amp;/g, "&")
            .replace(/#\w+/g, "") // Remove hashtags
            .replace(/\(Wait for it\.*\)/gi, "")
            .replace(/Wait for end/gi, "")
            .replace(/\|.*/, "") // Remove pipes often used in titles (e.g. "Title | Channel Name")
            .trim();
    }
}