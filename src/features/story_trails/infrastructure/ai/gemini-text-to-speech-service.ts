import { GoogleGenAI } from '@google/genai';
import { TextToSpeechService } from '../../domain/interface/ai-services';

export class GeminiTextToSpeechService implements TextToSpeechService {
    private readonly ai: GoogleGenAI;
    // specific model for TTS as per your documentation
    private readonly modelId = 'gemini-2.5-flash-preview-tts';

    constructor(apiKey: string) {
        if (!apiKey) {
            throw new Error('Gemini API key is missing.');
        }
        this.ai = new GoogleGenAI({ apiKey });
    }

    /**
     * Generates high-quality AI audio using Gemini 2.5 Flash TTS.
     * Wraps the raw PCM output in a WAV container so Flutter can play it.
     */
    async generateAudioFromText(text: string): Promise<Buffer> {
        try {
            console.log(`🎙️ Generating Gemini AI Audio for: "${text.substring(0, 30)}..."`);

            const responseStream = await this.ai.models.generateContentStream({
                model: this.modelId,
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: text }],
                    },
                ],
                config: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                // Voices: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede', 'Zephyr'
                                // 'Aoede' is excellent for storytelling (warm, female)
                                // 'Zephyr' is calm (male)
                                voiceName: 'Aoede',
                            },
                        },
                    },
                },
            });

            const rawAudioChunks: Buffer[] = [];
            let mimeType = 'audio/pcm; rate=24000'; // Default fallback

            // 1. Collect all raw PCM chunks
            for await (const chunk of responseStream) {
                const part = chunk.candidates?.[0]?.content?.parts?.[0];

                if (part?.inlineData?.data) {
                    // Update mimeType if provided (to get correct sample rate)
                    if (part.inlineData.mimeType) {
                        mimeType = part.inlineData.mimeType;
                    }

                    const buffer = Buffer.from(part.inlineData.data, 'base64');
                    rawAudioChunks.push(buffer);
                }
            }

            if (rawAudioChunks.length === 0) {
                throw new Error('Gemini API returned no audio data.');
            }

            // 2. Combine all raw chunks into one large PCM buffer
            const totalRawAudio = Buffer.concat(rawAudioChunks);

            // 3. Create the WAV Header
            // Gemini usually returns "audio/pcm; rate=24000" (24kHz, Mono, 16-bit)
            const options = this.parseMimeType(mimeType);
            const wavHeader = this.createWavHeader(totalRawAudio.length, options);

            // 4. Return the final playable WAV file (Header + Data)
            return Buffer.concat([wavHeader, totalRawAudio]);

        } catch (error) {
            console.error('❌ Error generating audio from Gemini:', error);
            // Fallback error handling handled by controller
            throw error;
        }
    }

    // --- WAV CONVERSION HELPERS (Adapted from your documentation) ---

    private parseMimeType(mimeType: string) {
        // Default defaults for Gemini TTS
        const options = {
            numChannels: 1,
            sampleRate: 24000,
            bitsPerSample: 16
        };

        const parts = mimeType.split(';');
        for (const part of parts) {
            const [key, value] = part.trim().split('=');
            if (key === 'rate' && value) {
                options.sampleRate = parseInt(value, 10);
            }
        }
        return options;
    }

    private createWavHeader(dataLength: number, options: { numChannels: number, sampleRate: number, bitsPerSample: number }) {
        const { numChannels, sampleRate, bitsPerSample } = options;
        const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
        const blockAlign = (numChannels * bitsPerSample) / 8;

        const buffer = Buffer.alloc(44);

        buffer.write('RIFF', 0);                      // ChunkID
        buffer.writeUInt32LE(36 + dataLength, 4);     // ChunkSize
        buffer.write('WAVE', 8);                      // Format
        buffer.write('fmt ', 12);                     // Subchunk1ID
        buffer.writeUInt32LE(16, 16);                 // Subchunk1Size (PCM)
        buffer.writeUInt16LE(1, 20);                  // AudioFormat (1 = PCM)
        buffer.writeUInt16LE(numChannels, 22);        // NumChannels
        buffer.writeUInt32LE(sampleRate, 24);         // SampleRate
        buffer.writeUInt32LE(byteRate, 28);           // ByteRate
        buffer.writeUInt16LE(blockAlign, 32);         // BlockAlign
        buffer.writeUInt16LE(bitsPerSample, 34);      // BitsPerSample
        buffer.write('data', 36);                     // Subchunk2ID
        buffer.writeUInt32LE(dataLength, 40);         // Subchunk2Size

        return buffer;
    }
}