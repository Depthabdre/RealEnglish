import { google, youtube_v3 } from 'googleapis';
import { VideoHarvestingService } from '../../domain/interface/video-harvesting-service';
import { ImmersionShort } from '../../domain/entities/immersion-short';
import { randomUUID } from 'crypto';

// ============================================================================
// REAL ENGLISH – HIGH QUALITY SHORTS (TV + FAMOUS CREATORS)
// ============================================================================

type HarvestCategory =
    | 'sitcom'
    | 'talk_show'
    | 'famous_creators'
    | 'storytelling'
    | 'visual';

const SEARCH_RECIPES: Record<HarvestCategory, string[]> = {
    // 🎬 TV Shows – Natural Dialogue
    sitcom: [
        'The Office shorts',
        'Friends tv show shorts',
        'Modern Family shorts',
        'Brooklyn Nine-Nine shorts'
    ],

    // 🎤 Talk Shows – Famous Hosts & Guests
    talk_show: [
        'The Ellen Show interview shorts',
        'The Tonight Show Jimmy Fallon interview shorts',
        'Jimmy Kimmel Live interview shorts',
        'The Graham Norton Show interview shorts',
        'The Late Show Stephen Colbert interview shorts'
    ],

    // 🌍 Famous English Shorts Creators
    famous_creators: [
        'Nas Daily shorts',
        'Zack D. Films shorts',
        'Mark Rober shorts',
        'Daily Dose of Internet shorts',
        'Yes Theory shorts',
        'Beast Philanthropy shorts',
        'MrBeast philanthropy shorts',
        'MrBeast interview shorts'
    ],

    // 📖 Calm Storytelling
    storytelling: [
        'Afrimax English shorts',
        'short documentary english narration shorts',
        'human story english shorts',
        'life story narration english shorts'
    ],

    // 🎥 Visual Context (Low Pressure)
    visual: [
        'Zach King shorts',
        'visual storytelling shorts english',
        'daily life POV shorts english'
    ]
};

// ❌ Content that reduces comprehension
const BLACKLIST_KEYWORDS = [
    'prank',
    'challenge',
    'try not to laugh',
    'compilation',
    'meme',
    'reaction',
    'scream'
];

export class YouTubeHarvestingService implements VideoHarvestingService {
    private readonly youtube: youtube_v3.Youtube;

    constructor() {
        const apiKey = process.env.YOUTUBE_API_KEY;
        if (!apiKey) {
            throw new Error('YOUTUBE_API_KEY is missing in .env file.');
        }

        this.youtube = google.youtube({
            version: 'v3',
            auth: apiKey
        });
    }

    /**
     * Harvests a mixed, high-quality English Shorts feed.
     */
    async harvestByCategory(_: string): Promise<ImmersionShort[]> {
        console.log('👉 [Harvester] Starting Real English Shorts harvest...');

        const categories = Object.keys(SEARCH_RECIPES) as HarvestCategory[];

        // Shuffle & pick 3 categories for diversity
        const selected = categories
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);

        const results = await Promise.all(
            selected.map(cat => this.fetchVideosForCategory(cat))
        );

        const mixed = results.flat().sort(() => Math.random() - 0.5);

        console.log(
            `✅ [Harvester] Completed. ${mixed.length} high-quality Shorts ready.`
        );

        return mixed;
    }

    private async fetchVideosForCategory(
        category: HarvestCategory
    ): Promise<ImmersionShort[]> {
        const queries = SEARCH_RECIPES[category];
        const query = queries[Math.floor(Math.random() * queries.length)];

        try {
            const response = await this.youtube.search.list({
                part: ['snippet'],
                q: query,
                type: ['video'],
                videoDuration: 'short',
                maxResults: 3,
                order: 'viewCount',
                videoDefinition: 'high',
                relevanceLanguage: 'en',
                regionCode: 'US',
                safeSearch: 'strict'
            });

            const items = response.data.items ?? [];

            return items
                .filter(item => this.isValidItem(item))
                .map(item => this.mapYouTubeItemToDomain(item, category));

        } catch (error) {
            console.error(
                `❌ [Harvester] Failed for category "${category}"`,
                error
            );
            return [];
        }
    }

    private isValidItem(item: youtube_v3.Schema$SearchResult): boolean {
        if (!item.id?.videoId || !item.snippet) return false;

        const title = item.snippet.title?.toLowerCase() ?? '';
        const channel = item.snippet.channelTitle?.toLowerCase() ?? '';

        // Extra protection against chaotic MrBeast content
        if (channel.includes('mrbeast') && title.includes('challenge')) {
            return false;
        }

        return !BLACKLIST_KEYWORDS.some(word => title.includes(word));
    }

    // 🚨 DATABASE MAPPING — UNCHANGED 🚨
    private mapYouTubeItemToDomain(
        item: youtube_v3.Schema$SearchResult,
        category: string
    ): ImmersionShort {
        const snippet = item.snippet!;
        const videoId = item.id!.videoId!;

        const rawTitle = snippet.title || 'Untitled';
        const rawDesc = snippet.description || '';

        const cleanTitle = this.cleanTitle(rawTitle);

        const text = (rawTitle + ' ' + rawDesc).toLowerCase();

        let difficulty: 'beginner' | 'intermediate' | 'advanced' =
            'intermediate';

        if (
            text.includes('story') ||
            text.includes('simple') ||
            text.includes('explained')
        ) {
            difficulty = 'beginner';
        } else if (
            text.includes('fast') ||
            text.includes('native') ||
            text.includes('advanced')
        ) {
            difficulty = 'advanced';
        }

        return new ImmersionShort(
            randomUUID(),
            videoId,
            cleanTitle,
            rawDesc,
            snippet.thumbnails?.high?.url ||
            snippet.thumbnails?.default?.url ||
            '',
            snippet.channelTitle || 'Unknown Channel',
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
            .replace(/&amp;/g, '&')
            .replace(/#\w+/g, '')
            .replace(/\(.*?\)/g, '')
            .replace(/\|.*/, '')
            .trim();
    }
}
