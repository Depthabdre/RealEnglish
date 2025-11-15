
import { GoogleGenerativeAI, ModelParams } from '@google/generative-ai';
import { StoryGenerationService } from '../../domain/interface/ai-services';
import { StoryTrail } from '../../domain/entities/story-trail';
import { StoryTrailRepository } from '../../domain/interface/story-trail-repository';
import { StorySegment } from '../../domain/entities/story-segment';
import { SingleChoiceChallenge } from '../../domain/entities/single-choice-challenge';
import { Choice } from '../../domain/entities/choice';
import { randomUUID } from 'crypto';

export class GeminiStoryGenerationService implements StoryGenerationService {
    private readonly ai: GoogleGenerativeAI;
    private readonly model: ModelParams = {
        model: 'gemini-2.5-pro',
        tools: [
            {
                googleSearchRetrieval: {
                    dynamicRetrievalConfig: {
                        dynamicThreshold: 0.5,
                    },
                },
            },
        ],
    };
    constructor(private readonly storyTrailRepository: StoryTrailRepository) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is not set in the environment variables.');
        }
        this.ai = new GoogleGenerativeAI(apiKey);
    }

    async generateStoryForLevel(level: number): Promise<StoryTrail> {
        let previousLevelContext = '';
        if (level > 1) {
            const previousStory = await this.storyTrailRepository.findFirstByLevel(level - 1);
            if (previousStory) {
                previousLevelContext = `The previous level's story (level ${level - 1}) was titled "${previousStory.title}". This new story for level ${level} should be slightly more advanced.`;
            }
        }

        const prompt = this.buildPrompt(level, previousLevelContext);
        const model = this.ai.getGenerativeModel(this.model);
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        try {
            const generatedJson = JSON.parse(responseText);
            return this.mapJsonToDomain(generatedJson);
        } catch (error) {
            console.error("Failed to parse JSON from Gemini:", responseText);
            throw new Error("AI service returned invalid story format.");
        }
    }

    private buildPrompt(level: number, context: string): string {
        return `
            You are a creative storyteller for a children's English learning app. Your task is to generate a complete "Story Trail" object in a single, valid JSON format.

            **Instructions:**
            1.  The story difficulty must be for level ${level}.
            2.  ${context}
            3.  Include 3-5 segments, with at least one 'narration' and one 'choiceChallenge'.
            4.  Use your search tool to find a real, public, royalty-free image URL for every 'image_url'. Do not invent URLs.
            5.  For each challenge, in the 'choices' array, **you MUST add an '"is_correct": true' property to the single correct choice** and '"is_correct": false' to all incorrect choices.
            6.  The final output MUST be only the JSON object, with no extra text or markdown.

            **JSON Schema to follow:**
            {
              "title": "A short, engaging title",
              "description": "A one-sentence description.",
              "image_url": "https://images.unsplash.com/...",
              "difficulty_level": ${level},
              "segments": [
                {
                  "type": "narration",
                  "text_content": "The first part of the story.",
                  "image_url": "https://images.pexels.com/..."
                },
                {
                  "type": "choiceChallenge",
                  "text_content": "A part of the story leading to a question.",
                  "image_url": "https://images.unsplash.com/...",
                  "challenge": {
                    "prompt": "A simple question for the child.",
                    "choices": [
                      { "text": "An incorrect option.", "image_url": "https://...", "is_correct": false },
                      { "text": "The correct option.", "image_url": "https://...", "is_correct": true }
                    ],
                    "correct_feedback": "Positive feedback!",
                    "incorrect_feedback": "Gentle corrective feedback."
                  }
                }
              ]
            }
        `;
    }

    private mapJsonToDomain(jsonData: any): StoryTrail {
        return new StoryTrail(
            randomUUID(),
            jsonData.title,
            jsonData.description,
            jsonData.image_url,
            jsonData.difficulty_level,
            jsonData.segments.map((seg: any) => {
                // FIX: Correctly type the challenge variable to allow it to be a challenge object OR null.
                let challenge: SingleChoiceChallenge | null = null;

                if (seg.challenge) {
                    const domainChoices = seg.challenge.choices.map((c: any) => new Choice(
                        randomUUID(),
                        c.text,
                        c.image_url
                    ));

                    const correctChoiceIndex = seg.challenge.choices.findIndex((c: any) => c.is_correct === true);

                    const correctId = correctChoiceIndex !== -1 ? domainChoices[correctChoiceIndex].id : domainChoices[0].id;

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
                    seg.image_url,
                    null,
                    challenge
                );
            })
        );
    }
}