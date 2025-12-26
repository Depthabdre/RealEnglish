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

        this.ai = new GoogleGenAI({ apiKey });
        this.modelId = 'gemini-flash-latest';
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

            console.log(`👉 Stage 4: Mapping to domain`);
            return this.mapJsonToDomain(json);

        } catch (error) {
            console.error('❌ Story generation failed:', error);
            throw new Error('AI service failed to generate a valid story.');
        }
    }

    // ---------------- JSON SAFETY ----------------
    private extractJsonSafely(text: string): any {
        const trimmed = text.trim();

        // Best case: pure JSON
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            return JSON.parse(trimmed);
        }

        // Fallback extraction
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

    // ---------------- PROMPT ----------------
    private buildPrompt(level: number, context: string): string {
        return `
CRITICAL OUTPUT RULES:
- Output ONLY valid JSON
- No explanations, no markdown, no comments
- Response MUST start with { and end with }
- Use double quotes only
- No trailing commas

STORY STYLE (VERY IMPORTANT):
You are a viral storyteller similar to Zack / Afrimax English.
The story must be so interesting that people want to share it.

RULES:
1. Start with a STRONG emotional hook in the first 2–3 sentences.
2. Write like a real human experience happening today.
3. Show inner thoughts, fear, hope, doubt, and decision-making.
4. Use simple, natural English suitable for Ethiopian learners.
5. The story must flow naturally, not like a lesson.
6. End with a quiet life insight, not preaching.

LEARNING PHILOSOPHY:
This app teaches English unconsciously.
The user should feel like they are listening to a story, not studying.

STRICTLY AVOID:
- Fantasy, magic, animals talking
- Kings, queens, treasure, dragons
- Over-dramatic action scenes

STORY REQUIREMENTS:
- Difficulty level: ${level}
- Context: ${context}
- Total segments: 8 to 12
- First segment MUST be narration
- EVERY segment MUST include "text_content" and it must NOT be empty.
- At least 3 choiceChallenge segments
- Each choiceChallenge MUST have exactly 2 choices
- Exactly ONE choice must be correct

VISUAL STYLE:
Cinematic, realistic, emotional, modern.
Good for short-video thumbnails.

JSON SCHEMA (FOLLOW EXACTLY):
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
          { "text": "Option A", "visual_description": "visual cue", "is_correct": false },
          { "text": "Option B", "visual_description": "visual cue", "is_correct": true }
        ],
        "correct_feedback": "Correct feedback",
        "incorrect_feedback": "Incorrect feedback"
      }
    }
  ]
}

FINAL CHECK:
Before responding, internally verify the JSON is valid.
If not valid, FIX it before outputting.
`;
    }

    // ---------------- DOMAIN MAPPING ----------------
    private mapJsonToDomain(jsonData: any): StoryTrail {
        const storyId = randomUUID();

        // Pollinations image generation (free)
        const generateUrl = (desc: string) => {
            if (!desc) return 'https://via.placeholder.com/512';

            const seed = Math.floor(Math.random() * 10000);
            const style =
                ' cinematic digital art, realistic, emotional lighting, modern scene';
            const encoded = encodeURIComponent(desc + style);

            return `https://image.pollinations.ai/prompt/${encoded}?width=512&height=512&seed=${seed}&nologo=true`;
        };

        return new StoryTrail(
            storyId,
            jsonData.title,
            jsonData.description,
            generateUrl(jsonData.visual_description || jsonData.title),
            jsonData.difficulty_level,
            jsonData.segments.map((seg: any, index: number) => {
                let challenge: SingleChoiceChallenge | null = null;

                if (seg.type === 'choiceChallenge' && seg.challenge) {
                    const domainChoices = seg.challenge.choices.map((c: any) =>
                        new Choice(
                            randomUUID(),
                            c.text,
                            generateUrl(c.visual_description || c.text)
                        )
                    );

                    const correctIndex = seg.challenge.choices.findIndex(
                        (c: any) => c.is_correct === true
                    );

                    const correctId =
                        domainChoices[correctIndex]?.id ?? domainChoices[0].id;

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
                    index,
                    seg.type,
                    seg.text_content,
                    generateUrl(seg.visual_description || 'story scene'),
                    null,
                    challenge
                );
            })
        );
    }
}
