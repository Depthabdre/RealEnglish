export class ImmersionShort {
    constructor(
        public readonly id: string,
        public readonly youtubeId: string,
        // The display title (cleaned up for "Real English" users)
        public readonly title: string,
        public readonly description: string,
        public readonly thumbnailUrl: string,
        public readonly channelName: string,
        // Using string types for flexibility in the "Curator" model
        public readonly difficulty: 'beginner' | 'intermediate' | 'advanced',
        public readonly category: 'funny' | 'real_life' | 'motivation' | 'culture' | 'mix',
        // --- UI STATE HELPERS ---
        // These might be populated dynamically based on the user requesting the feed
        public readonly isSaved: boolean = false,
        public readonly isWatched: boolean = false
    ) { }
}