import { StoryTrail } from '../entities/story-trail';

/**
 * Interface for a service that generates story content.
 */
export interface StoryGenerationService {
    generateStoryForLevel(level: number): Promise<StoryTrail>;
}

/**
 * Interface for a service that converts text into audio speech.
 */
export interface TextToSpeechService {
    generateAudioFromText(text: string): Promise<Buffer>; // Returns raw audio data as a Buffer
}