import {
    GoogleGenerativeAI,
    GenerateContentRequest,
    ModelParams,
} from '@google/generative-ai';
import { TextToSpeechService } from '../../domain/interface/ai-services';

export class GeminiTextToSpeechService implements TextToSpeechService {
    private readonly ai: GoogleGenerativeAI;
    private readonly model: ModelParams = { model: 'gemini-2.5-pro-preview-tts' };

    constructor(apiKey: string) {
        // Ensure the API key is provided, otherwise throw a clear error.
        if (!apiKey) {
            throw new Error('Gemini API key is missing. Please provide it in the environment variables.');
        }
        this.ai = new GoogleGenerativeAI({ apiKey });
    }

    /**
     * Generates audio from text using a pre-configured storyteller voice.
     * @param text The narration text to convert to speech.
     * @returns A Buffer containing the raw audio data.
     */
    async generateAudioFromText(text: string): Promise<Buffer> {
        // This configuration is key to achieving the storyteller tone.
        // We are telling the API we specifically want an audio response
        // and requesting the 'Leda' voice, which is great for narration.
        const config: GenerateContentRequest = {
            responseMimeType: 'audio/mpeg', // Requesting MP3 audio format
            responseModalities: ['audio'],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: {
                        // 'Leda' is a voice designed to be engaging and suitable for storytelling.
                        voiceName: 'Leda',
                    },
                },
            },
        };

        const contents = [{
            role: 'user',
            parts: [{ text }],
        }];

        try {
            // We use the streaming method to handle binary audio data correctly.
            const responseStream = await this.ai.models.generateContentStream({
                model: this.model.model,
                config,
                contents,
            });

            const audioBuffers: Buffer[] = [];

            // We iterate through the stream and collect all the audio chunks.
            for await (const chunk of responseStream) {
                const audioPart = chunk.candidates?.[0]?.content?.parts?.[0];

                if (audioPart && 'inlineData' in audioPart && audioPart.inlineData.data) {
                    const buffer = Buffer.from(audioPart.inlineData.data, 'base64');
                    audioBuffers.push(buffer);
                }
            }

            // If we didn't receive any audio data, something went wrong.
            if (audioBuffers.length === 0) {
                throw new Error('Gemini API did not return any audio data.');
            }

            // Join all the received chunks into a single audio buffer.
            return Buffer.concat(audioBuffers);

        } catch (error) {
            console.error('Error generating audio from Gemini:', error);
            throw new Error('Failed to generate audio due to an external API error.');
        }
    }
}