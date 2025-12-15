import { google, youtube_v3 } from 'googleapis';
import { VideoHarvestingService } from '../../domain/interface/video-harvesting-service';
import { ImmersionShort } from '../../domain/entities/immersion-short';
import { randomUUID } from 'crypto';

// ============================================================================
// CONFIGURATION: The "Real English" Content Strategy
// ============================================================================
// We map the database categories (Keys) to specific high-context queries.
//
// 1. funny -> "Relatable": Situational humor teaches meaning through acting.
// 2. real_life -> "Immersion": POV and Vlogs mimic how children observe parents.
// 3. motivation -> "Curiosity": "Did you know?" facts are more addictive than speeches.
// 4. culture -> "Social Skills": How to behave, dating, and polite interactions.
const SEARCH_RECIPES: Record<string, string[]> = {
    funny: [
        "relatable comedy skits english",   // Situations (work/school) where acting explains words
        "customer service skits shorts",    // Teaches polite vs impolite tone
        "stand up comedy crowd work clean", // Unscripted, fast, natural interaction
        "the office best moments shorts"    // Culturally relevant, clear dialog
    ],
    real_life: [
        "day in the life vlog aesthetic voiceover", // Narrated action (The "Parent" method)
        "ordering food pov shorts",                 // "Point of View" - prepares brain for real tasks
        "street interview london nyc",              // Exposure to real accents and speed
        "asking strangers questions shorts"         // Simple Q&A structures
    ],
    motivation: [
        "psychology facts shorts",          // High curiosity gap ("Why do humans...")
        "today i learned shorts",           // Addictive bite-sized knowledge
        "how it works shorts explanation",  // Technical but simple English
        "simon sinek shorts"                // Clear, articulate standard English
    ],
    culture: [
        "social skills tips shorts",        // How to be confident (very popular)
        "modern dating advice shorts",      // Conversational and engaging
        "american vs british english shorts", // Comparative linguistics
        "conversation starters tips"        // Practical tools for speaking
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

    async harvestByCategory(category: string): Promise<ImmersionShort[]> {
        console.log(`👉 [Harvester] Stage 1: Selecting search query for category: '${category}'...`);

        // Handle the case where the UseCase asks for 'mix' or an unknown category
        // If unknown, default to 'real_life' to be safe.
        const validCategory = SEARCH_RECIPES[category] ? category : 'real_life';
        const queries = SEARCH_RECIPES[validCategory];

        // Pick one random query to keep results fresh and unpredictable
        const randomQuery = queries[Math.floor(Math.random() * queries.length)];
        console.log(`👉 [Harvester] Stage 2: Calling YouTube API with query: "${randomQuery}"...`);

        try {
            const response = await this.youtube.search.list({
                part: ['snippet'],
                q: randomQuery,
                type: ['video'],
                videoDuration: 'short', // CRITICAL: Only fetch Shorts (< 60s)
                maxResults: 10,
                order: 'relevance',     // Ensure high-quality matches

                // --- STRICT ENGLISH ENFORCEMENT ---
                relevanceLanguage: 'en', // Tells YouTube: "Content MUST be for English speakers"
                regionCode: 'US',        // Favors US/UK/Canada content over mixed-language regions
                safeSearch: 'strict'     // No inappropriate content
            });

            const items = response.data.items || [];
            console.log(`👉 [Harvester] Stage 3: Found ${items.length} videos. Mapping to Domain...`);

            // Filter items that might be missing snippets (rare but possible)
            return items
                .filter(item => item.id?.videoId && item.snippet)
                .map(item => this.mapYouTubeItemToDomain(item, validCategory));

        } catch (error) {
            console.error("❌ [Harvester] YouTube API Failed:", error);
            // Return empty list on failure so the app doesn't crash, 
            // allowing the UseCase to handle the fallback or empty state.
            return [];
        }
    }

    private mapYouTubeItemToDomain(item: youtube_v3.Schema$SearchResult, category: string): ImmersionShort {
        const snippet = item.snippet!;
        const videoId = item.id!.videoId!;

        const rawTitle = snippet.title || "Untitled";
        const rawDesc = snippet.description || "";

        // 1. Clean the Title (Remove clickbait caps, hashtags, HTML entities)
        const cleanTitle = this.cleanTitle(rawTitle);

        // 2. Auto-Detect Difficulty
        // We look for keywords in the title/desc to guess the level
        const textToCheck = (rawTitle + " " + rawDesc).toLowerCase();
        let difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'; // Default

        if (textToCheck.includes('easy') ||
            textToCheck.includes('beginner') ||
            textToCheck.includes('basic') ||
            textToCheck.includes('kids') ||
            textToCheck.includes('slow')) {
            difficulty = 'beginner';
        } else if (
            textToCheck.includes('advanced') ||
            textToCheck.includes('native') ||
            textToCheck.includes('fast') ||
            textToCheck.includes('news')) {
            difficulty = 'advanced';
        }

        return new ImmersionShort(
            randomUUID(), // Generate our own internal ID
            videoId,
            cleanTitle,
            rawDesc,
            snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || "",
            snippet.channelTitle || "Unknown Channel",
            difficulty,
            category as any, // Cast to our Union type
            false, // isSaved (Default false)
            false  // isWatched (Default false)
        );
    }

    // Helper to remove garbage from YouTube titles to make them look like "Real English" content
    private cleanTitle(rawTitle: string): string {
        return rawTitle
            // Decode HTML entities
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&amp;/g, "&")
            // Remove hashtags (e.g. #shorts #english)
            .replace(/#\w+/g, "")
            // Remove common clickbait suffixes like "Wait for it..."
            .replace(/\(Wait for it\.*\)/gi, "")
            .replace(/Wait for end/gi, "")
            // Remove Emojis (Optional, but keeps UI clean)
            // .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
            .trim();
    }
}