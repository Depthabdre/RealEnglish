import { google, youtube_v3 } from 'googleapis';
import { VideoHarvestingService } from '../../domain/interface/video-harvesting-service';
import { ImmersionShort } from '../../domain/entities/immersion-short';
import { randomUUID } from 'crypto';

// Define the shape of our search recipes
const SEARCH_RECIPES: Record<string, string[]> = {
    funny: ["stand up comedy shorts clean", "the office best moments shorts", "dry bar comedy shorts"],
    real_life: ["daily vlog aesthetic shorts", "street interview london shorts", "asking strangers questions shorts"],
    motivation: ["simon sinek shorts", "steve harvey motivation shorts", "jordan peterson advice shorts"],
    culture: ["american vs british english shorts", "cultural differences shorts", "learning english tips shorts"]
};

export class YouTubeHarvestingService implements VideoHarvestingService {
    private readonly youtube: youtube_v3.Youtube;

    constructor() {
        const apiKey = process.env.YOUTUBE_API_KEY;
        if (!apiKey) throw new Error('YOUTUBE_API_KEY is missing.');

        this.youtube = google.youtube({
            version: 'v3',
            auth: apiKey
        });
    }

    async harvestByCategory(category: string): Promise<ImmersionShort[]> {
        console.log(`👉 Stage 1: Selecting search query for category: '${category}'...`);

        const queries = SEARCH_RECIPES[category];
        if (!queries) throw new Error(`Invalid category: ${category}`);

        // Pick one random query to keep results fresh
        const randomQuery = queries[Math.floor(Math.random() * queries.length)];
        console.log(`👉 Stage 2: Calling YouTube API with query: "${randomQuery}"...`);

        try {
            const response = await this.youtube.search.list({
                part: ['snippet'],
                q: randomQuery,
                type: ['video'],
                videoDuration: 'short', // CRITICAL: Fetch Shorts only
                relevanceLanguage: 'en',
                maxResults: 10,
                safeSearch: 'strict' // Ensure content is appropriate
            });

            const items = response.data.items || [];
            console.log(`👉 Stage 3: Found ${items.length} videos. Mapping to Domain...`);

            return items.map(item => this.mapYouTubeItemToDomain(item, category));

        } catch (error) {
            console.error("YouTube Harvest Failed:", error);
            return []; // Return empty list on failure so the app doesn't crash
        }
    }

    private mapYouTubeItemToDomain(item: youtube_v3.Schema$SearchResult, category: string): ImmersionShort {
        const snippet = item.snippet!;
        const videoId = item.id?.videoId || "";

        // Simple Auto-Tagging for Difficulty
        const textToCheck = (snippet.title + " " + snippet.description).toLowerCase();
        let difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'; // Default

        if (textToCheck.includes('easy') || textToCheck.includes('beginner') || textToCheck.includes('basic')) {
            difficulty = 'beginner';
        } else if (textToCheck.includes('advanced') || textToCheck.includes('native') || textToCheck.includes('fast')) {
            difficulty = 'advanced';
        }

        return new ImmersionShort(
            randomUUID(), // Internal ID
            videoId,
            this.cleanTitle(snippet.title || "Untitled"),
            snippet.description || "",
            snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || "",
            snippet.channelTitle || "Unknown Channel",
            difficulty,
            category as any,
            false,
            false
        );
    }

    // Helper to remove garbage from YouTube titles
    private cleanTitle(rawTitle: string): string {
        // Decodes HTML entities (simple replace for common ones) and removes hashtags
        return rawTitle
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&amp;/g, "&")
            .replace(/#\w+/g, "") // Remove hashtags
            .trim();
    }
}