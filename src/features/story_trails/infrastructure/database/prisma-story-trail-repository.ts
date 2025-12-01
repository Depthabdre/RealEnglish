import { PrismaClient } from '@prisma/client';
import { StoryTrail } from '../../domain/entities/story-trail';
import { StoryTrailRepository } from '../../domain/interface/story-trail-repository';
import { StorySegment } from '../../domain/entities/story-segment';
import { SingleChoiceChallenge } from '../../domain/entities/single-choice-challenge';
import { Choice } from '../../domain/entities/choice';
// Add other entity imports as needed...

export class PrismaStoryTrailRepository implements StoryTrailRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async findById(trailId: string): Promise<StoryTrail | null> {
        const trailData = await this.prisma.storyTrail.findUnique({
            where: { id: trailId },
            include: {
                segments: {
                    include: {
                        challenge: {
                            include: {
                                choices: true,
                            },
                        },
                    },
                },
            },
        });

        if (!trailData) return null;

        // Note: You would map the Prisma object to your domain entity here.
        // This is important for decoupling, but for brevity, I'll skip the full mapping.
        return trailData as any;
    }

    async findNextIncompleteByLevel(level: number, userId: string): Promise<StoryTrail | null> {
        console.log(`🔍 Repo: Searching for Level ${level} story not completed by ${userId}...`);

        // 1. Normalize Level: Ensure we don't search for Level 0 if stories start at 1
        const searchLevel = level < 1 ? 1 : level;

        const trailData = await this.prisma.storyTrail.findFirst({
            where: {
                difficultyLevel: searchLevel,
                // Ensure the user hasn't finished this specific story
                completedBy: {
                    none: {
                        userId: userId,
                    },
                },
            },
            // 2. CRITICAL: You must include the full tree, otherwise the mapping fails later
            include: {
                segments: {
                    orderBy: { id: 'asc' }, // Optional: Ensure segments stay in order
                    include: {
                        challenge: {
                            include: {
                                choices: true,
                            },
                        },
                    },
                },
            },
        });

        if (!trailData) {
            console.log("⚠️ Repo: No existing incomplete story found in DB.");
            return null;
        }

        console.log(`✅ Repo: Found existing story in DB: "${trailData.title}"`);

        // 3. Map to Domain Entity (Explicit mapping is safer than 'as any')
        return this.mapToDomain(trailData);
    }

    async findSegmentById(segmentId: string): Promise<StorySegment | null> {
        const segmentData = await this.prisma.storySegment.findUnique({
            where: { id: segmentId },
        });

        if (!segmentData) return null;
        return segmentData as any;
    }

    async findFirstByLevel(level: number): Promise<StoryTrail | null> {
        const trailData = await this.prisma.storyTrail.findFirst({
            where: { difficultyLevel: level },
            // We still need the full data structure for context
            include: {
                segments: {
                    include: {
                        challenge: {
                            include: {
                                choices: true,
                            },
                        },
                    },
                },
            },
        });

        if (!trailData) return null;
        return trailData as any; // Map to domain entity
    }

    /**
     * Saves a full story trail with segments, challenges, and choices.
     */
    async save(storyTrail: StoryTrail): Promise<void> {
        await this.prisma.storyTrail.create({
            data: {
                id: storyTrail.id,
                title: storyTrail.title,
                description: storyTrail.description,
                imageUrl: storyTrail.imageUrl,
                difficultyLevel: storyTrail.difficultyLevel,
                segments: {
                    create: storyTrail.segments.map((segment) => ({
                        id: segment.id,
                        type: segment.type,
                        textContent: segment.textContent,
                        imageUrl: segment.imageUrl,
                        audioUrl: segment.audioUrl,

                        // --- FIX IS HERE ---
                        challenge: segment.challenge ? {
                            create: {
                                id: segment.challenge.id,
                                prompt: segment.challenge.prompt,

                                // Map Entity property 'correctAnswerId' to DB column
                                correctAnswerId: segment.challenge.correctAnswerId,

                                // Map the Feedback fields!
                                // If these lines are missing, Prisma saves NULL.
                                correctFeedback: segment.challenge.correctFeedback,
                                incorrectFeedback: segment.challenge.incorrectFeedback,

                                choices: {
                                    create: segment.challenge.choices.map((choice) => ({
                                        id: choice.id,
                                        text: choice.text,
                                        imageUrl: choice.imageUrl
                                    }))
                                }
                            }
                        } : undefined
                        // -------------------
                    }))
                }
            }
        });
    }
    // 2. Implementation for updating the URL (The core part)
    async updateSegmentAudioUrl(segmentId: string, audioUrl: string): Promise<void> {
        await this.prisma.storySegment.update({
            where: { id: segmentId },
            data: {
                audioUrl: audioUrl
            }
        });
    }

    // --- HELPER: Map Prisma Data to Domain Entity ---
    private mapToDomain(raw: any): StoryTrail {
        return new StoryTrail(
            raw.id,
            raw.title,
            raw.description,
            raw.imageUrl,
            raw.difficultyLevel,
            raw.segments.map((seg: any) => {

                // FIX: Explicitly type the variable so TypeScript allows assignment
                let challenge: SingleChoiceChallenge | null = null;

                if (seg.challenge) {
                    challenge = new SingleChoiceChallenge(
                        seg.challenge.id,
                        'singleChoice',
                        seg.challenge.prompt,
                        seg.challenge.choices.map((c: any) => new Choice(c.id, c.text, c.imageUrl)),
                        seg.challenge.correctAnswerId,
                        seg.challenge.correctFeedback,
                        seg.challenge.incorrectFeedback
                    );
                }

                return new StorySegment(
                    seg.id,
                    seg.type,
                    seg.textContent,
                    seg.imageUrl,
                    seg.audioUrl,
                    challenge
                );
            })
        );
    }
}

