import { GoogleGenAI } from '@google/genai';
import { randomUUID } from 'crypto';
import { StoryGenerationService } from '../../domain/interface/ai-services';
import { StoryTrail } from '../../domain/entities/story-trail';
import { StoryTrailRepository } from '../../domain/interface/story-trail-repository';
import { StorySegment } from '../../domain/entities/story-segment';
import { SingleChoiceChallenge } from '../../domain/entities/single-choice-challenge';
import { Choice } from '../../domain/entities/choice';

export class GeminiStoryGenerationService implements StoryGenerationService {
    private readonly ai: GoogleGenAI;
    private readonly modelId: string;

    constructor(private readonly storyTrailRepository: StoryTrailRepository) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('GEMINI_API_KEY is missing.');

        this.ai = new GoogleGenAI({ apiKey: apiKey });
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

            console.log("👉 Stage 4: constructing URLs (Fast Mode)...");
            return this.mapJsonToDomain(generatedJson);

        } catch (error) {
            console.error("Story Generation Failed:", error);
            throw new Error("AI service failed to generate a valid story.");
        }
    }

    private extractFirstJson(text: string): any {
        const match = text.match(/[\{\[]/);
        if (!match || match.index === undefined) throw new Error("No JSON found.");

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

        if (endIndex === -1) throw new Error("Unbalanced JSON");

        const jsonString = text.substring(startIndex, endIndex + 1);
        try {
            const cleaned = jsonString.replace(/[\u0000-\u001F]+/g, " ");
            const parsed = JSON.parse(cleaned);
            if (Array.isArray(parsed)) return parsed[0];
            return parsed;
        } catch (e) {
            throw new Error("Failed to parse JSON");
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
            4.  **IMPORTANT:** The FIRST segment must always be 'narration'. Do not start with a challenge.
            
            **IMAGES:**
            Generate a **"visual_description"** (5-10 words) for each scene.

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

    private mapJsonToDomain(jsonData: any): StoryTrail {
        const storyId = randomUUID();

        const generateUrl = (desc: string) => {
            if (!desc) return 'https://via.placeholder.com/300';
            const seed = Math.floor(Math.random() * 10000);
            const encoded = encodeURIComponent(desc + " cute children book illustration style");
            return `https://image.pollinations.ai/prompt/${encoded}?nologo=true&width=1024&height=1024&seed=${seed}`;
        };

        return new StoryTrail(
            storyId,
            jsonData.title,
            jsonData.description,
            generateUrl(jsonData.visual_description || jsonData.title),
            jsonData.difficulty_level,
            jsonData.segments.map((seg: any) => {
                let challenge: SingleChoiceChallenge | null = null;

                // --- FIX: Strict Type Check ---
                // Only create a challenge if the segment type explicitly allows it.
                // This prevents 'narration' segments from accidentally having challenges.
                if (seg.type === 'choiceChallenge' && seg.challenge) {
                    const choices = Array.isArray(seg.challenge.choices) ? seg.challenge.choices : [];
                    const domainChoices = choices.map((c: any) => new Choice(
                        randomUUID(),
                        c.text,
                        generateUrl(c.visual_description || c.text)
                    ));

                    let correctChoiceIndex = choices.findIndex((c: any) => c.is_correct === true);
                    if (correctChoiceIndex === -1) correctChoiceIndex = 0;

                    const correctId = domainChoices.length > 0 ? domainChoices[correctChoiceIndex].id : randomUUID();

                    challenge = new SingleChoiceChallenge(
                        randomUUID(),
                        'singleChoice',
                        seg.challenge.prompt,
                        domainChoices,
                        correctId,
                        seg.challenge.correct_feedback,
                        seg.challenge.incorrect_feedback
                    );
                }

                return new StorySegment(
                    randomUUID(),
                    seg.type,
                    seg.text_content,
                    generateUrl(seg.visual_description || "story scene"),
                    null,
                    challenge
                );
            })
        );
    }
}