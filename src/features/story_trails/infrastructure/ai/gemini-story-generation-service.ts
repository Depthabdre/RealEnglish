import { GoogleGenAI } from '@google/genai';
import { randomUUID } from 'crypto';
import axios from 'axios';
import { StoryGenerationService } from '../../domain/interface/ai-services';
import { StoryTrail } from '../../domain/entities/story-trail';
import { StoryTrailRepository } from '../../domain/interface/story-trail-repository';
import { StorySegment } from '../../domain/entities/story-segment';
import { SingleChoiceChallenge } from '../../domain/entities/single-choice-challenge';
import { Choice } from '../../domain/entities/choice';
import { ObsStorageService } from '../storage/obs-service';

export class GeminiStoryGenerationService implements StoryGenerationService {
    private readonly ai: GoogleGenAI;
    private readonly modelId: string;
    private readonly obsService = new ObsStorageService();

    constructor(private readonly storyTrailRepository: StoryTrailRepository) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('GEMINI_API_KEY is missing.');

        this.ai = new GoogleGenAI({ apiKey: apiKey });
        // Use 'gemini-2.0-flash' for speed and higher quotas during dev
        this.modelId = 'gemini-2.0-flash';
    }

    async generateStoryForLevel(level: number): Promise<StoryTrail> {
        console.log(`👉 Stage 1: Preparing prompt for Level ${level}...`);

        let previousLevelContext = '';
        if (level > 1) {
            const previousStory = await this.storyTrailRepository.findFirstByLevel(level - 1);
            if (previousStory) {
                previousLevelContext = `The previous level's story (level ${level - 1}) was titled "${previousStory.title}". This new story for level ${level} should be slightly more advanced.`;
            }
        }

        const prompt = this.buildPrompt(level, previousLevelContext);

        try {
            console.log(`👉 Stage 2: Calling Gemini (${this.modelId})...`);

            const result = await this.ai.models.generateContent({
                model: this.modelId,
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });

            const responseText = result.text;
            if (!responseText) throw new Error("AI returned empty response");

            console.log("👉 Stage 3: Extracting JSON...");
            const generatedJson = this.extractFirstJson(responseText);

            console.log("👉 Stage 4: Processing Images (Sequential with Retry)...");
            return await this.mapJsonToDomainWithCloudImages(generatedJson);

        } catch (error) {
            console.error("Story Generation Failed:", error);
            throw new Error("AI service failed to generate a valid story.");
        }
    }

    private extractFirstJson(text: string): any {
        const match = text.match(/[\{\[]/);
        if (!match || match.index === undefined) throw new Error("No JSON structure found.");

        const startIndex = match.index;
        const startChar = match[0];
        const endChar = startChar === '{' ? '}' : ']';

        let balance = 0;
        let endIndex = -1;

        for (let i = startIndex; i < text.length; i++) {
            const char = text[i];
            if (char === startChar) balance++;
            else if (char === endChar) {
                balance--;
                if (balance === 0) {
                    endIndex = i;
                    break;
                }
            }
        }

        if (endIndex === -1) throw new Error(`Invalid JSON: Unbalanced ${startChar}${endChar}`);

        const jsonString = text.substring(startIndex, endIndex + 1);
        try {
            const cleaned = jsonString.replace(/[\u0000-\u001F]+/g, " ");
            const parsed = JSON.parse(cleaned);
            if (Array.isArray(parsed)) return parsed[0];
            return parsed;
        } catch (e) {
            throw new Error("Failed to parse extracted JSON.");
        }
    }

    private buildPrompt(level: number, context: string): string {
        return `
            You are a creative storyteller for a children's English learning app. 
            Your task is to generate a complete "Story Trail" object in a single, valid JSON format.

            **Story Requirements:**
            1.  Difficulty Level: ${level}.
            2.  Context: ${context}
            3.  Structure: Include 3-5 segments.
            
            **IMAGES:**
            Generate a **"visual_description"** (5-10 words) for each scene. DO NOT generate URLs.

            **JSON Schema:**
            {
              "title": "Story Title",
              "description": "Short description",
              "visual_description": "visual description of cover",
              "difficulty_level": ${level},
              "segments": [
                {
                  "type": "narration",
                  "text_content": "Story text...",
                  "visual_description": "scene description"
                },
                {
                  "type": "choiceChallenge",
                  "text_content": "Story text...",
                  "visual_description": "scene description",
                  "challenge": {
                    "prompt": "Question?",
                    "choices": [
                      { "text": "A", "visual_description": "icon desc", "is_correct": false },
                      { "text": "B", "visual_description": "icon desc", "is_correct": true }
                    ],
                    "correct_feedback": "Yes!",
                    "incorrect_feedback": "No."
                  }
                }
              ]
            }
        `;
    }

    private async mapJsonToDomainWithCloudImages(jsonData: any): Promise<StoryTrail> {
        if (!jsonData || !jsonData.segments) throw new Error("Invalid AI JSON");

        const storyId = randomUUID();
        const segments: StorySegment[] = [];

        // Helper to pause execution
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        // 1. Cover Image
        const coverImageUrl = await this.processImage(storyId, 'cover', jsonData.visual_description || jsonData.title);
        await delay(2000); // Wait 2s

        // 2. Segments (Sequential Loop)
        for (const [index, seg] of jsonData.segments.entries()) {
            // Segment Image
            const segImageUrl = await this.processImage(storyId, `seg_${index}`, seg.visual_description || "story scene");
            await delay(2000); // Wait 2s between requests

            // Challenge
            let challenge: SingleChoiceChallenge | null = null;
            if (seg.challenge) {
                const choices: Choice[] = [];
                const rawChoices = Array.isArray(seg.challenge.choices) ? seg.challenge.choices : [];

                for (const [cIndex, c] of rawChoices.entries()) {
                    const choiceUrl = await this.processImage(storyId, `seg_${index}_choice_${cIndex}`, c.visual_description || c.text);
                    choices.push(new Choice(randomUUID(), c.text, choiceUrl));
                    await delay(1000); // Wait 1s between choices
                }

                let correctChoiceIndex = rawChoices.findIndex((c: any) => c.is_correct === true);
                if (correctChoiceIndex === -1) correctChoiceIndex = 0;

                const correctId = choices.length > 0 ? choices[correctChoiceIndex].id : randomUUID();

                challenge = new SingleChoiceChallenge(
                    randomUUID(),
                    'singleChoice',
                    seg.challenge.prompt,
                    choices,
                    correctId,
                    seg.challenge.correct_feedback,
                    seg.challenge.incorrect_feedback
                );
            }

            segments.push(new StorySegment(
                randomUUID(),
                seg.type,
                seg.text_content,
                segImageUrl,
                null,
                challenge
            ));
        }

        return new StoryTrail(
            storyId,
            jsonData.title,
            jsonData.description,
            coverImageUrl,
            jsonData.difficulty_level,
            segments
        );
    }

    /**
     * ROBUST IMAGE PROCESSOR
     * Includes Retry Logic with Exponential Backoff for 429 Errors.
     */
    private async processImage(storyId: string, suffix: string, description: string): Promise<string> {
        if (!description) return 'https://via.placeholder.com/300?text=No+Desc';

        const encoded = encodeURIComponent(description + " cute children book illustration style");
        const pollinationUrl = `https://image.pollinations.ai/prompt/${encoded}?nologo=true&width=1024&height=1024&seed=${Math.floor(Math.random() * 1000)}`;

        const fileName = `images/${storyId}/${suffix}.jpg`;
        const maxRetries = 3;
        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                console.log(`🎨 Downloading: ${suffix} (Attempt ${attempt + 1})...`);

                // Increased timeout to 30s because generation is slow
                const response = await axios.get(pollinationUrl, {
                    responseType: 'arraybuffer',
                    timeout: 30000
                });

                const buffer = Buffer.from(response.data);
                const obsUrl = await this.obsService.uploadFile(fileName, buffer, 'image/jpeg');
                return obsUrl;

            } catch (error: any) {
                const isRateLimit = error.response?.status === 429;
                const isTimeout = error.code === 'ECONNABORTED';

                if (isRateLimit || isTimeout) {
                    attempt++;
                    const waitTime = attempt * 3000; // Wait 3s, then 6s, then 9s
                    console.warn(`⚠️ Rate Limit/Timeout for ${suffix}. Retrying in ${waitTime / 1000}s...`);

                    // Wait before retrying
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                } else {
                    // If it's a 404 or other fatal error, stop trying
                    console.error(`❌ Fatal Error for ${suffix}:`, error.message);
                    break;
                }
            }
        }

        console.error(`🚨 Failed to process ${suffix} after ${maxRetries} attempts. Using fallback.`);
        return 'https://via.placeholder.com/300?text=Image+Unavailable';
    }
}