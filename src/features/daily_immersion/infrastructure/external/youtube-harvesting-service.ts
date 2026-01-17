import { google, youtube_v3 } from 'googleapis';
import { VideoHarvestingService } from '../../domain/interface/video-harvesting-service';
import { ImmersionShort } from '../../domain/entities/immersion-short';
import { randomUUID } from 'crypto';

// ============================================================================
// 🧠 THE BRAIN: CURATED "INPUT HYPOTHESIS" SOURCES
// ============================================================================

type ChannelDefinition = {
    id: string; // Can be Channel ID (UC...) or Handle (@Name)
    name: string;
    category: 'storytelling' | 'science_visual' | 'funny_sketch' | 'funny_standup' | 'funny_animation' | 'context_tv' | 'interview_celeb' | 'nature_relax' | 'visual_magic';
    tags: string[];
    difficulty: 'beginner' | 'intermediate' | 'advanced';
};

const TRUSTED_CHANNELS: ChannelDefinition[] = [
    // =========================================================
    // 🧠 MOTIVATION, PODCASTS & DEEP DIVES (Clear, Professional Audio)
    // =========================================================
    { id: '@JayShetty', name: 'Jay Shetty', category: 'storytelling', tags: ['wisdom', 'motivation', 'life'], difficulty: 'intermediate' },
    { id: '@TheDiaryOfACEO', name: 'The Diary Of A CEO', category: 'interview_celeb', tags: ['business', 'psychology', 'British_accent'], difficulty: 'advanced' },
    { id: '@SimonSinek', name: 'Simon Sinek', category: 'storytelling', tags: ['leadership', 'work', 'inspiration'], difficulty: 'intermediate' },
    { id: '@melrobbins', name: 'Mel Robbins', category: 'storytelling', tags: ['motivation', 'advice', 'American_accent'], difficulty: 'intermediate' },
    { id: '@BigThink', name: 'Big Think', category: 'science_visual', tags: ['philosophy', 'science', 'ideas'], difficulty: 'advanced' },
    { id: '@theschooloflife', name: 'The School of Life', category: 'storytelling', tags: ['psychology', 'philosophy', 'British_accent'], difficulty: 'intermediate' },
    { id: '@aliabdaal', name: 'Ali Abdaal', category: 'storytelling', tags: ['productivity', 'tech', 'British_accent'], difficulty: 'intermediate' },

    // =========================================================
    // 📖 STORYTELLING & ADVENTURE
    // =========================================================
    { id: '@YesTheory', name: 'Yes Theory', category: 'storytelling', tags: ['adventure', 'friendship', 'travel'], difficulty: 'intermediate' },
    { id: '@NasDaily', name: 'Nas Daily', category: 'storytelling', tags: ['travel', 'life', 'culture'], difficulty: 'beginner' },
    { id: 'UC5ezaY-8H80_y230sT2YqAg', name: 'Project Nightfall', category: 'storytelling', tags: ['society', 'moral'], difficulty: 'intermediate' },
    { id: '@AfrimaxEnglish', name: 'Afrimax English', category: 'storytelling', tags: ['human_story', 'emotion'], difficulty: 'intermediate' },
    { id: '@IAmMarkManson', name: 'Mark Manson', category: 'storytelling', tags: ['psychology', 'advice'], difficulty: 'advanced' },
    { id: '@BeastPhilanthropy', name: 'Beast Philanthropy', category: 'storytelling', tags: ['charity', 'kindness'], difficulty: 'beginner' },
    { id: '@drewbinsky', name: 'Drew Binsky', category: 'storytelling', tags: ['travel', 'culture'], difficulty: 'beginner' },
    { id: '@GreatBigStory', name: 'Great Big Story', category: 'storytelling', tags: ['documentary'], difficulty: 'intermediate' },

    // =========================================================
    // 🧪 SCIENCE, VISUALS & FACTS
    // =========================================================
    { id: '@zackdfilms', name: 'Zack D. Films', category: 'science_visual', tags: ['animation', 'weird_facts'], difficulty: 'beginner' },
    { id: '@DailyDoseOfInternet', name: 'Daily Dose of Internet', category: 'science_visual', tags: ['viral', 'interesting'], difficulty: 'beginner' },
    { id: '@MarkRober', name: 'Mark Rober', category: 'science_visual', tags: ['engineering', 'fun'], difficulty: 'intermediate' },
    { id: '@veritasium', name: 'Veritasium', category: 'science_visual', tags: ['science', 'education'], difficulty: 'advanced' },
    { id: '@kurzgesagt', name: 'Kurzgesagt', category: 'science_visual', tags: ['animation', 'science'], difficulty: 'intermediate' },
    { id: '@TheActionLab', name: 'The Action Lab', category: 'science_visual', tags: ['experiments', 'physics'], difficulty: 'beginner' },
    { id: '@TED', name: 'TED', category: 'science_visual', tags: ['ideas', 'speech'], difficulty: 'advanced' },

    // =========================================================
    // 😂 FUNNY SKETCHES (Relatable Situations)
    // =========================================================
    { id: '@RyanGeorge', name: 'Ryan George', category: 'funny_sketch', tags: ['comedy', 'skit'], difficulty: 'intermediate' },
    { id: '@StevenHe', name: 'Steven He', category: 'funny_sketch', tags: ['comedy', 'family'], difficulty: 'intermediate' },
    { id: '@VivaLaDirtLeague', name: 'Viva La Dirt League', category: 'funny_sketch', tags: ['workplace', 'retail'], difficulty: 'intermediate' },
    { id: '@CorporateBro', name: 'Corporate Bro', category: 'funny_sketch', tags: ['business', 'office'], difficulty: 'advanced' },
    { id: '@TheOdd1sOut', name: 'TheOdd1sOut', category: 'funny_animation', tags: ['storytime', 'life'], difficulty: 'beginner' },
    { id: '@DryBarComedy', name: 'Dry Bar Comedy', category: 'funny_standup', tags: ['clean', 'stories'], difficulty: 'intermediate' },

    // =========================================================
    // 🎬 TV & CONTEXT (Natural Dialogue)
    // =========================================================
    { id: '@TheOffice', name: 'The Office US', category: 'context_tv', tags: ['workplace', 'sitcom'], difficulty: 'intermediate' },
    { id: '@Friends', name: 'Friends', category: 'context_tv', tags: ['social', 'sitcom'], difficulty: 'intermediate' },
    { id: '@brooklyn99', name: 'Brooklyn Nine-Nine', category: 'context_tv', tags: ['police', 'sitcom'], difficulty: 'intermediate' },
    { id: '@ModernFamily', name: 'Modern Family', category: 'context_tv', tags: ['family', 'home'], difficulty: 'intermediate' },

    // =========================================================
    // 🎤 CELEBRITY INTERVIEWS & NATURE
    // =========================================================
    { id: '@wired', name: 'WIRED', category: 'interview_celeb', tags: ['Q&A', 'celebrity'], difficulty: 'beginner' },
    { id: '@Vogue', name: 'Vogue', category: 'interview_celeb', tags: ['fast-talk', 'lifestyle'], difficulty: 'advanced' },
    { id: '@BBCEarth', name: 'BBC Earth', category: 'nature_relax', tags: ['nature', 'animals'], difficulty: 'intermediate' },
    { id: '@NatGeo', name: 'National Geographic', category: 'nature_relax', tags: ['nature', 'culture'], difficulty: 'intermediate' }
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
     * Harvests a maximum of 6 curated videos.
     * Strategy: Pick 3 Channels -> Fetch 2 Videos from each.
     */
    async harvestByCategory(category: string): Promise<ImmersionShort[]> {
        console.log(`👉 [Harvester] Starting Curated Harvest (Max 6) for category: ${category}...`);

        // 1. Filter Trusted Channels by Category
        let targetChannels = TRUSTED_CHANNELS;

        // Map generic requests to our specific internal categories
        if (category === 'sitcom') {
            targetChannels = TRUSTED_CHANNELS.filter(c => c.category === 'context_tv');
        } else if (category === 'funny') {
            targetChannels = TRUSTED_CHANNELS.filter(c => c.category.startsWith('funny'));
        } else if (category === 'science' || category === 'visual') {
            targetChannels = TRUSTED_CHANNELS.filter(c => c.category === 'science_visual');
        } else if (category === 'story') {
            targetChannels = TRUSTED_CHANNELS.filter(c => c.category === 'storytelling');
        }

        // 2. Pick 3 Random Channels from the filtered list
        // We pick 3 channels so we can take 2 videos from each = 6 Total
        const selectedChannels = targetChannels
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);

        console.log(`📡 Selected Sources: ${selectedChannels.map(c => c.name).join(', ')}`);

        // 3. Fetch 2 videos from each channel
        const results = await Promise.all(
            selectedChannels.map(channel => this.fetchShortsFromChannel(channel, 2))
        );

        // 4. Flatten and Shuffle
        const mixed = results.flat().sort(() => Math.random() - 0.5);

        console.log(`✅ [Harvester] Completed. ${mixed.length} curated Shorts ready.`);
        return mixed;
    }

    /**
     * The core logic: Resolves Channel -> Uploads Playlist -> Videos -> Filter Shorts
     * Limits the output to 'limit' (default 2).
     */
    private async fetchShortsFromChannel(
        channelDef: ChannelDefinition,
        limit: number = 2
    ): Promise<ImmersionShort[]> {
        try {
            // A. Get the "Uploads" Playlist ID
            const uploadsPlaylistId = await this.getUploadsPlaylistId(channelDef.id);
            if (!uploadsPlaylistId) return [];

            // B. Get the most recent 15 videos from that playlist (Fetch enough to find valid shorts)
            const playlistItems = await this.youtube.playlistItems.list({
                part: ['snippet'],
                playlistId: uploadsPlaylistId,
                maxResults: 15
            });

            const videoIds = playlistItems.data.items
                ?.map(item => item.snippet?.resourceId?.videoId)
                .filter((id): id is string => !!id) || [];

            if (videoIds.length === 0) return [];

            // C. Get Video Details (Needed for Duration & Captions)
            const videosResponse = await this.youtube.videos.list({
                part: ['snippet', 'contentDetails', 'statistics'],
                id: videoIds
            });

            const videos = videosResponse.data.items || [];

            // D. Filter & Map & Limit
            return videos
                .filter(video => this.isHighQualityShort(video)) // Strict Short Filter
                .slice(0, limit) // 👈 Enforce the limit here (e.g., 2 videos)
                .map(video => this.mapToDomain(video, channelDef));

        } catch (error) {
            console.error(`❌ [Harvester] Failed to fetch for ${channelDef.name}`, error);
            return [];
        }
    }

    /**
     * Resolves a Channel ID (UC...) or Handle (@NasDaily) to their "Uploads" playlist ID.
     */
    private async getUploadsPlaylistId(channelIdentifier: string): Promise<string | null> {
        try {
            const params: any = {
                part: ['contentDetails'],
            };

            if (channelIdentifier.startsWith('@')) {
                params.forHandle = channelIdentifier;
            } else {
                params.id = channelIdentifier;
            }

            const response = await this.youtube.channels.list(params);
            const items = response.data.items;

            if (!items || items.length === 0) {
                console.warn(`⚠️ Channel not found: ${channelIdentifier}`);
                return null;
            }

            return items[0].contentDetails?.relatedPlaylists?.uploads || null;
        } catch (e) {
            console.error(`Error resolving channel ${channelIdentifier}`, e);
            return null;
        }
    }

    /**
     * Strict Filter: Must be < 60 seconds (Short) and not restricted.
     */
    private isHighQualityShort(video: youtube_v3.Schema$Video): boolean {
        const durationIso = video.contentDetails?.duration; // e.g., "PT59S" or "PT1M"
        if (!durationIso) return false;

        // Parse ISO 8601 duration to seconds
        const seconds = this.parseDuration(durationIso);

        // 1. Must be <= 60 seconds (YouTube Shorts definition)
        if (seconds > 60) return false;

        // 2. Filter out very short junk (< 5 seconds)
        if (seconds < 5) return false;

        // 3. Title Check (Optional safety against re-uploads/compilations)
        const title = video.snippet?.title?.toLowerCase() || '';
        const blacklist = ['hindi', 'dub', 'sub español', 'compilation'];
        if (blacklist.some(b => title.includes(b))) return false;

        return true;
    }

    private mapToDomain(
        video: youtube_v3.Schema$Video,
        channelDef: ChannelDefinition
    ): ImmersionShort {
        const snippet = video.snippet!;
        const videoId = video.id!;

        // Clean up title
        const cleanTitle = snippet.title
            ?.replace(/#\w+/g, '') // Remove hashtags
            .replace(/\|.*/, '') // Remove pipes
            .trim() || 'Untitled';

        return new ImmersionShort(
            randomUUID(),
            videoId,
            cleanTitle,
            snippet.description || '',
            snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
            channelDef.name, // Use our clean curated name, not the messy API one
            channelDef.difficulty,
            channelDef.category as any, // Cast to domain type
            false,
            false
        );
    }

    /**
     * Helper to parse "PT1M2S" into integer seconds.
     */
    private parseDuration(isoDuration: string): number {
        const match = isoDuration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
        if (!match) return 0;

        const hours = parseInt(match[1] || '0') || 0;
        const minutes = parseInt(match[2] || '0') || 0;
        const seconds = parseInt(match[3] || '0') || 0;

        return (hours * 3600) + (minutes * 60) + seconds;
    }
}