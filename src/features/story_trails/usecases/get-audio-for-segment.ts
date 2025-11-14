import { TextToSpeechService } from '../domain/interface/ai-services';
import { StoryTrailRepository } from '../domain/interface/story-trail-repository';

export interface GetAudioForSegmentInput {
    segmentId: string;
}

export class GetAudioForSegmentUseCase {
    constructor(
        private readonly storyTrailRepository: StoryTrailRepository,
        private readonly textToSpeechService: TextToSpeechService
    ) { }

    async execute(input: GetAudioForSegmentInput): Promise<Buffer> {
        const segment = await this.storyTrailRepository.findSegmentById(input.segmentId);

        if (!segment || segment.type !== 'narration' || !segment.textContent) {
            throw new Error('Narration segment not found or has no content.');
        }

        const audioBuffer = await this.textToSpeechService.generateAudioFromText(segment.textContent);

        return audioBuffer;
    }
}