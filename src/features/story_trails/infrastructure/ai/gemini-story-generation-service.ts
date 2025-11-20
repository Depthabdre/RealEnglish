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
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is not set in the environment variables.');
        }

        this.ai = new GoogleGenAI({ apiKey: apiKey });

        // UPDATED MODEL: 
        // Using 'gemini-2.0-flash' or 'gemini-2.0-pro-exp-02-05' is recommended.
        // If you have specific access to 'gemini-2.5-pro', you can use it here.
        // 'gemini-2.0-pro-exp-02-05' is excellent for creative writing.
        // this.modelId = 'gemini-2.0-pro-exp-02-05';
        this.modelId = 'gemini-2.5-pro';
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
                config: {
                    // FIX: Now that we removed the tool, we can safely enforce strict JSON
                    responseMimeType: 'application/json',
                }
            });

            const responseText = result.text;

            if (!responseText) {
                throw new Error("AI returned empty response");
            }

            console.log("👉 Stage 3: Extracting JSON...");
            const generatedJson = this.extractFirstJson(responseText);

            console.log("👉 Stage 4: Mapping to Domain & Generating Image URLs...");
            return this.mapJsonToDomain(generatedJson);

        } catch (error) {
            console.error("Story Generation Failed. Error Details:", error);
            throw new Error("AI service failed to generate a valid story.");
        }
    }

    private extractFirstJson(text: string): any {
        // 1. Locate JSON
        const firstBraceIndex = text.indexOf('{');
        if (firstBraceIndex === -1) throw new Error("No JSON object found");

        // 2. Simple extraction logic (assuming valid JSON from strict mode)
        // We try to parse the whole string first if it looks clean, otherwise simple substring
        try {
            return JSON.parse(text);
        } catch {
            // Fallback: Find closing brace
            let balance = 0;
            let endIndex = -1;
            for (let i = firstBraceIndex; i < text.length; i++) {
                if (text[i] === '{') balance++;
                else if (text[i] === '}') {
                    balance--;
                    if (balance === 0) {
                        endIndex = i;
                        break;
                    }
                }
            }
            if (endIndex === -1) throw new Error("Unbalanced JSON");
            return JSON.parse(text.substring(firstBraceIndex, endIndex + 1));
        }
    }

    private buildPrompt(level: number, context: string): string {
        return `
            You are a creative storyteller for a children's English learning app. 
            Your task is to generate a complete "Story Trail" object in a single, valid JSON format.

            **Story Requirements:**
            1.  Difficulty Level: ${level}.
            2.  Context: ${context}
            3.  Structure: 3-5 segments (mix of 'narration' and 'choiceChallenge').

            **CRITICAL CHANGE FOR IMAGES:**
            **DO NOT generate image URLs.** Instead, generate a **"visual_description"** field.
            Describe the scene visually in 5-10 words (e.g., "cute cartoon cat running in a sunny forest").
            The system will use this description to generate the image.

            **JSON Schema:**
            {
              "title": "Story Title",
              "description": "Short description",
              "visual_description": "visual description of the cover image",
              "difficulty_level": ${level},
              "segments": [
                {
                  "type": "narration",
                  "text_content": "Story text...",
                  "visual_description": "visual description of this scene"
                },
                {
                  "type": "choiceChallenge",
                  "text_content": "Story text leading to question...",
                  "visual_description": "visual description of this scene",
                  "challenge": {
                    "prompt": "Question text?",
                    "choices": [
                      { "text": "Option A", "visual_description": "icon or image description for this choice", "is_correct": false },
                      { "text": "Option B", "visual_description": "icon or image description for this choice", "is_correct": true }
                    ],
                    "correct_feedback": "Good job!",
                    "incorrect_feedback": "Try again."
                  }
                }
              ]
            }
        `;
    }

    private mapJsonToDomain(jsonData: any): StoryTrail {
        // Helper to generate reliable AI Image URLs
        const generateImageUrl = (description: string): string => {
            if (!description) return 'https://via.placeholder.com/300?text=No+Image';
            // Usage: https://image.pollinations.ai/prompt/[description]
            // We add 'cartoon' or 'illustration' style to make it kid-friendly
            const encoded = encodeURIComponent(description + " cute children book illustration style");
            return `https://image.pollinations.ai/prompt/${encoded}?nologo=true&width=1024&height=1024`;
        };

        return new StoryTrail(
            randomUUID(),
            jsonData.title,
            jsonData.description,
            generateImageUrl(jsonData.visual_description || jsonData.title),
            jsonData.difficulty_level,
            jsonData.segments.map((seg: any) => {
                let challenge: SingleChoiceChallenge | null = null;

                if (seg.challenge) {
                    const domainChoices = seg.challenge.choices.map((c: any) => new Choice(
                        randomUUID(),
                        c.text,
                        generateImageUrl(c.visual_description || c.text)
                    ));

                    let correctChoiceIndex = seg.challenge.choices.findIndex((c: any) => c.is_correct === true);
                    if (correctChoiceIndex === -1) correctChoiceIndex = 0;

                    challenge = new SingleChoiceChallenge(
                        randomUUID(),
                        'singleChoice',
                        seg.challenge.prompt,
                        domainChoices,
                        domainChoices[correctChoiceIndex].id,
                        seg.challenge.correct_feedback,
                        seg.challenge.incorrect_feedback
                    );
                }
                return new StorySegment(
                    randomUUID(),
                    seg.type,
                    seg.text_content,
                    generateImageUrl(seg.visual_description || "story scene"),
                    null,
                    challenge
                );
            })
        );
    }
}