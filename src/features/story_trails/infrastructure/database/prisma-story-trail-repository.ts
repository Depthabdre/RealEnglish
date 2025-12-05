import { PrismaClient } from '@prisma/client';
import { StoryTrail } from '../../domain/entities/story-trail';
import { StoryTrailRepository } from '../../domain/interface/story-trail-repository';
import { StorySegment } from '../../domain/entities/story-segment';
import { SingleChoiceChallenge } from '../../domain/entities/single-choice-challenge';
import { Choice } from '../../domain/entities/choice';

export class PrismaStoryTrailRepository implements StoryTrailRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async findById(trailId: string): Promise<StoryTrail | null> {
        const trailData = await this.prisma.storyTrail.findUnique({
            where: { id: trailId },
            include: {
                segments: {
                    // CRITICAL: Ensure segments are returned in the correct story order
                    orderBy: { orderIndex: 'asc' },
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

        return this.mapToDomain(trailData);
    }

    async findNextIncompleteByLevel(level: number, userId: string): Promise<StoryTrail | null> {
        console.log(`🔍 Repo: Searching for Level ${level} story not completed by ${userId}...`);

        // 1. Normalize Level
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
            include: {
                segments: {
                    // CRITICAL: Sort by orderIndex
                    orderBy: { orderIndex: 'asc' },
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

        return this.mapToDomain(trailData);
    }

    async findSegmentById(segmentId: string): Promise<StorySegment | null> {
        const segmentData = await this.prisma.storySegment.findUnique({
            where: { id: segmentId },
            include: {
                challenge: {
                    include: {
                        choices: true,
                    },
                },
            }
        });

        if (!segmentData) return null;

        // We map this individual segment to the domain entity
        // We handle the challenge mapping inline here since it's a single segment
        let challenge: SingleChoiceChallenge | null = null;
        if (segmentData.challenge) {
            challenge = new SingleChoiceChallenge(
                segmentData.challenge.id,
                'singleChoice',
                segmentData.challenge.prompt,
                segmentData.challenge.choices.map((c) => new Choice(c.id, c.text, c.imageUrl)),
                segmentData.challenge.correctAnswerId,
                segmentData.challenge.correctFeedback,
                segmentData.challenge.incorrectFeedback
            );
        }

        return new StorySegment(
            segmentData.id,
            segmentData.orderIndex, // Include Order Index
            segmentData.type,
            segmentData.textContent,
            segmentData.imageUrl,
            segmentData.audioUrl,
            challenge
        );
    }

    async findFirstByLevel(level: number): Promise<StoryTrail | null> {
        const trailData = await this.prisma.storyTrail.findFirst({
            where: { difficultyLevel: level },
            include: {
                segments: {
                    // CRITICAL: Sort by orderIndex
                    orderBy: { orderIndex: 'asc' },
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
        return this.mapToDomain(trailData);
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

                        // --- FIX: Save the Order Index ---
                        orderIndex: segment.orderIndex,
                        // ---------------------------------

                        type: segment.type,
                        textContent: segment.textContent,
                        imageUrl: segment.imageUrl,
                        audioUrl: segment.audioUrl,

                        challenge: segment.challenge ? {
                            create: {
                                id: segment.challenge.id,
                                prompt: segment.challenge.prompt,

                                // Map Entity property 'correctAnswerId' to DB column
                                correctAnswerId: segment.challenge.correctAnswerId,

                                // Map the Feedback fields!
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
                    }))
                }
            }
        });
    }

    // Implementation for updating the URL (The core part)
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

                    // --- FIX: Map the Order Index from DB to Entity ---
                    seg.orderIndex,
                    // -------------------------------------------------

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