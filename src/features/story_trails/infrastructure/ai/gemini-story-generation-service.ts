import { GoogleGenerativeAI, ModelParams } from '@google/generative-ai';
import { StoryGenerationService } from '../../domain/interface/ai-services';
import { StoryTrail } from '../../domain/entities/story-trail';
import { StoryTrailRepository } from '../../domain/interface/story-trail-repository';

// We'll use this to help generate unique IDs for our new entities
import { randomUUID } from 'crypto';
import { StorySegment } from '../../domain/entities/story-segment';

export class GeminiStoryGenerationService implements StoryGenerationService {
    private readonly ai: GoogleGenerativeAI;
    private readonly model: ModelParams = {
        model: 'gemini-2.5-pro',
        tools: [{ google_search: {} }], // Enable the search tool for images
    };

    // We inject the repository to get context about previous levels
    constructor(
        apiKey: string,
        private readonly storyTrailRepository: StoryTrailRepository
    ) {
        if (!apiKey) {
            throw new Error('Gemini API key is missing.');
        }
        this.ai = new GoogleGenerativeAI({ apiKey });
    }

    async generateStoryForLevel(level: number): Promise<StoryTrail> {
        // 1. Get context from the previous level for progressive difficulty
        let previousLevelContext = '';
        if (level > 1) {
            const previousStory = await this.storyTrailRepository.findFirstByLevel(level - 1);
            if (previousStory) {
                previousLevelContext = `The previous level's story (level ${level - 1}) was titled "${previousStory.title}". This new story for level ${level} should be slightly more advanced, with more complex sentences and vocabulary.`;
            }
        }

        // 2. Construct the detailed, structured prompt
        const prompt = this.buildPrompt(level, previousLevelContext);

        // 3. Call the Gemini API
        const model = this.ai.getGenerativeModel(this.model);
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // 4. Parse and validate the JSON response
        try {
            const generatedJson = JSON.parse(responseText);
            // 5. Map the raw JSON to our strongly-typed domain entities
            return this.mapJsonToDomain(generatedJson);
        } catch (error) {
            console.error("Failed to parse JSON from Gemini:", responseText);
            throw new Error("AI service returned invalid story format.");
        }
    }

    private buildPrompt(level: number, context: string): string {
        // This prompt engineering is CRITICAL for getting reliable, structured output.
        return `
            You are a creative storyteller for a children's English learning app. Your task is to generate a complete "Story Trail" object in a valid JSON format.

            **Instructions:**
            1.  The story's difficulty must be appropriate for level ${level}.
            2.  ${context}
            3.  The story must contain between 3 and 5 segments. At least one must be a 'narration' and at least one a 'choiceChallenge'.
            4.  For every 'imageUrl', you MUST use your search tool to find a real, publicly accessible, high-quality, royalty-free image URL (e.g., from unsplash.com, pexels.com). DO NOT invent URLs.
            5.  The 'correctAnswerId' in a challenge must match the 'id' of one of the choices.
            6.  The final output MUST be a single, valid JSON object and nothing else. Do not include any text, notes, or markdown backticks before or after the JSON.

            **JSON Schema to follow:**
            {
              "title": "A short, engaging title for the story",
              "description": "A one-sentence description of the story's plot.",
              "image_url": "A real image URL representing the whole story.",
              "difficulty_level": ${level},
              "segments": [
                {
                  "type": "narration",
                  "text_content": "The first part of the story. A few simple sentences.",
                  "image_url": "A real image URL for this specific scene."
                },
                {
                  "type": "choiceChallenge",
                  "text_content": "A part of the story that leads to a question.",
                  "image_url": "A real image URL for this challenge scene.",
                  "challenge": {
                    "challenge_type": "singleChoice",
                    "prompt": "A simple question for the child, e.g., 'What should she do?'",
                    "choices": [
                      { "text": "The first option.", "image_url": "A real icon or image URL for this choice." },
                      { "text": "The second, correct option.", "image_url": "A real icon or image URL for this choice." }
                    ],
                    "correct_feedback": "Positive feedback, e.g., 'Great job!'",
                    "incorrect_feedback": "Gentle corrective feedback, e.g., 'Try again!'"
                  }
                }
              ]
            }
        `;
    }

    private mapJsonToDomain(jsonData: any): StoryTrail {
        // This function adds unique IDs and maps the raw data to our class instances.
        // A more robust implementation would use a validation library like Zod here.
        return new StoryTrail(
            randomUUID(),
            jsonData.title,
            jsonData.description,
            jsonData.image_url,
            jsonData.difficulty_level,
            jsonData.segments.map((seg: any) => new StorySegment(
                randomUUID(),
                seg.type,
                seg.text_content,
                seg.image_url,
                null, // audioEndpoint is null initially
                seg.challenge ? {
                    id: randomUUID(),
                    challengeType: 'singleChoice',
                    prompt: seg.challenge.prompt,
                    correctFeedback: seg.challenge.correct_feedback,
                    incorrectFeedback: seg.challenge.incorrect_feedback,
                    choices: seg.challenge.choices.map((c: any) => ({
                        id: randomUUID(),
                        text: c.text,
                        imageUrl: c.image_url
                    })),
                    // This is complex: we need to find which generated choice is correct
                    // For now, we'll assume the AI gives text, and we find the ID we just made
                    correctAnswerId: (() => {
                        const correctChoice = seg.challenge.choices.find((c: any) => c.text === "THE_CORRECT_TEXT_FROM_AI"); // This part is tricky and needs refinement in the prompt
                        // A better prompt would ask the AI to return an index or a specific property
                        return "temp_id_placeholder"; // Placeholder for now
                    })()
                } : null
            ))
        );
    }
}