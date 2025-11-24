import { TextToSpeechService } from '../domain/interface/ai-services';
import { StoryTrailRepository } from '../domain/interface/story-trail-repository';
// Import the specific OBS service we created
import { ObsStorageService } from '../infrastructure/storage/obs-service';

export interface GetAudioForSegmentInput {
    segmentId: string;
}

export class GetAudioForSegmentUseCase {
    // We initialize the storage service internally to keep DI simple
    private readonly obsService = new ObsStorageService();

    constructor(
        private readonly storyTrailRepository: StoryTrailRepository,
        private readonly textToSpeechService: TextToSpeechService
    ) { }

    /**
     * Returns the Public URL of the audio file.
     * Generates, Uploads, and Saves it if it doesn't exist yet.
     */
    async execute(input: GetAudioForSegmentInput): Promise<string> {
        const segment = await this.storyTrailRepository.findSegmentById(input.segmentId);

        if (!segment || segment.type !== 'narration' || !segment.textContent) {
            throw new Error('Narration segment not found or has no content.');
        }

        // 1. CHECK DB: Do we already have the Cloud URL?
        // If yes, return it immediately. Fast path! 🚀
        if (segment.audioUrl) {
            console.log(`✅ Audio found in DB: ${segment.audioUrl}`);
            return segment.audioUrl;
        }

        // 2. GENERATE: If missing, create audio using Gemini
        console.log(`🔊 Audio missing for ${input.segmentId}. Generating with AI...`);
        const audioBuffer = await this.textToSpeechService.generateAudioFromText(segment.textContent);

        // 3. UPLOAD: Send to Ethio Telecom OBS
        // We structure files as "stories/{segmentId}.wav"
        const fileName = `stories/${input.segmentId}.wav`;
        // --- FIX HERE: Use uploadFile and specify 'audio/wav' ---
        const cloudUrl = await this.obsService.uploadFile(fileName, audioBuffer, 'audio/wav');

        // 4. SAVE: Update the database with the new URL
        // This ensures next time we hit step #1
        await this.storyTrailRepository.updateSegmentAudioUrl(input.segmentId, cloudUrl);

        return cloudUrl;
    }
}