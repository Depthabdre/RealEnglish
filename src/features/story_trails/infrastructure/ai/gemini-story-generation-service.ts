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
    private readonly pollinationsKey: string;

    constructor(private readonly storyTrailRepository: StoryTrailRepository) {
        const apiKey = process.env.GEMINI_API_KEY;
        const pKey = process.env.POLLINATIONS_API_KEY;

        if (!apiKey) throw new Error('GEMINI_API_KEY is missing.');
        if (!pKey) throw new Error('POLLINATIONS_API_KEY is missing.');

        this.ai = new GoogleGenAI({ apiKey });
        this.modelId = 'gemini-flash-latest';
        this.pollinationsKey = pKey.trim(); // Ensure no whitespace
    }

    async generateStoryForLevel(level: number): Promise<StoryTrail> {
        console.log(`👉 Stage 1: Preparing story for level ${level}`);

        let previousLevelContext = '';
        if (level > 1) {
            const prev = await this.storyTrailRepository.findFirstByLevel(level - 1);
            if (prev) {
                previousLevelContext =
                    `Previous story title was "${prev.title}". This story should feel slightly deeper and more emotional.`;
            }
        }

        const prompt = this.buildPrompt(level, previousLevelContext);

        try {
            console.log(`👉 Stage 2: Calling Gemini`);

            const result = await this.ai.models.generateContent({
                model: this.modelId,
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    temperature: 0.9
                }
            });

            const text = result.text;
            if (!text) throw new Error('Empty AI response');

            console.log(`👉 Stage 3: Parsing JSON`);
            const json = this.extractJsonSafely(text);

            console.log(`👉 Stage 4: Generating Images (Key: ${this.pollinationsKey.substring(0, 5)}...)`);
            return await this.mapJsonToDomainWithCloudImages(json);

        } catch (error) {
            console.error('❌ Story generation failed:', error);
            throw new Error('AI service failed to generate a valid story.');
        }
    }

    private extractJsonSafely(text: string): any {
        const trimmed = text.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            return JSON.parse(trimmed);
        }
        const start = trimmed.indexOf('{');
        const end = trimmed.lastIndexOf('}');
        if (start === -1 || end === -1) {
            throw new Error('No JSON found in response');
        }
        const jsonString = trimmed
            .substring(start, end + 1)
            .replace(/[\u0000-\u001F]+/g, ' ');
        return JSON.parse(jsonString);
    }

    private buildPrompt(level: number, context: string): string {
        return `
CRITICAL OUTPUT RULES:
- Output ONLY valid JSON
- No explanations, no markdown, no comments
- Response MUST start with { and end with }
- Use double quotes only
- No trailing commas

STORY STYLE:
Write like a viral storyteller (Zack / Afrimax English). Deep emotional hook.
Simple, natural English. Flowing narrative. No preaching.

STORY REQUIREMENTS:
- Difficulty level: ${level}
- Context: ${context}
- 8-12 segments
- Mix of narration and choiceChallenge
- Visual style: Cinematic, realistic, emotional.

JSON SCHEMA:
{
  "title": "Story title",
  "description": "Short description",
  "visual_description": "cover scene",
  "difficulty_level": ${level},
  "segments": [
    {
      "type": "narration",
      "text_content": "Story text",
      "visual_description": "scene"
    },
    {
      "type": "choiceChallenge",
      "text_content": "Story text",
      "visual_description": "scene",
      "challenge": {
        "prompt": "Question?",
        "choices": [
          { "text": "A", "visual_description": "cue", "is_correct": false },
          { "text": "B", "visual_description": "cue", "is_correct": true }
        ],
        "correct_feedback": "Yes",
        "incorrect_feedback": "No"
      }
    }
  ]
}
`;
    }

    private async mapJsonToDomainWithCloudImages(jsonData: any): Promise<StoryTrail> {
        const storyId = randomUUID();

        // 1. Process Cover Image
        const coverImageUrl = await this.processImage(
            storyId,
            'cover',
            jsonData.visual_description || jsonData.title
        );

        // 2. Process Segments
        const segments: StorySegment[] = [];

        for (const [index, seg] of jsonData.segments.entries()) {
            const segmentId = randomUUID();

            // A. Generate Segment Image
            const segImageUrl = await this.processImage(
                storyId,
                `seg_${index}`,
                seg.visual_description || 'story scene'
            );

            // B. Process Challenge
            let challenge: SingleChoiceChallenge | null = null;

            if (seg.type === 'choiceChallenge' && seg.challenge) {
                const choices: Choice[] = [];
                for (const [cIndex, c] of seg.challenge.choices.entries()) {
                    const choiceUrl = await this.processImage(
                        storyId,
                        `seg_${index}_choice_${cIndex}`,
                        c.visual_description || c.text
                    );
                    choices.push(new Choice(randomUUID(), c.text, choiceUrl));
                }

                const correctIndex = seg.challenge.choices.findIndex(
                    (c: any) => c.is_correct === true
                );
                const correctId = choices[correctIndex]?.id ?? choices[0].id;

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
                segmentId,
                index,
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

    private async processImage(storyId: string, suffix: string, description: string): Promise<string> {
        const safeDesc = (description || 'scene').substring(0, 100).trim();
        const style = 'cinematic digital art, realistic, emotional lighting, modern scene';

        // 1. Clean Prompt Construction
        // We trim to avoid leading spaces which can cause 400 errors in URL paths
        const finalPrompt = `${safeDesc} ${style}`.trim();
        const encodedPrompt = encodeURIComponent(finalPrompt);

        // 2. Use the correct API Endpoint structure
        const url = `https://gen.pollinations.ai/image/${encodedPrompt}`;

        const fileName = `images/${storyId}/${suffix}.jpg`;
        const seed = Math.floor(Math.random() * 1000);

        try {
            console.log(`🎨 Generating: ${suffix}...`);

            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 60000,
                headers: {
                    'Authorization': `Bearer ${this.pollinationsKey}`
                },
                // 3. FIX: Pass query params cleanly via axios 'params'
                // This prevents URL malformation errors (400)
                params: {
                    width: 1024,
                    height: 1024,
                    nologo: true,
                    seed: seed,
                    model: 'flux' // Explicitly request Flux model
                }
            });

            const buffer = Buffer.from(response.data);
            const obsUrl = await this.obsService.uploadFile(fileName, buffer, 'image/jpeg');
            return obsUrl;

        } catch (error: any) {
            // Enhanced Logging
            const status = error.response?.status;
            const errorBody = error.response?.data?.toString('utf8'); // Try to read error buffer

            console.error(`⚠️ Failed to generate ${suffix} (Status: ${status})`);
            if (errorBody) console.error(`   Server Response: ${errorBody}`);
            else console.error(`   Message: ${error.message}`);

            return 'https://via.placeholder.com/512?text=Image+Error';
        }
    }
}