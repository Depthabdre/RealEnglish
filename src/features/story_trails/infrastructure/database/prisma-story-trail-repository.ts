import { PrismaClient } from '@prisma/client';
import { StoryTrail } from '../../domain/entities/story-trail';
import { StoryTrailRepository } from '../../domain/interface/story-trail-repository';
import { StorySegment } from '../../domain/entities/story-segment';
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
        const trailData = await this.prisma.storyTrail.findFirst({
            where: {
                difficultyLevel: level,
                // Check that there is NO entry in CompletedStory for this user and story
                completedBy: {
                    none: {
                        userId: userId,
                    },
                },
            },
            include: { /* ... same includes as findById ... */ }
        });

        if (!trailData) return null;
        return trailData as any;
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

    async save(storyTrail: StoryTrail): Promise<void> {
        // This is more complex as it involves creating nested relations.
        await this.prisma.storyTrail.create({
            data: {
                id: storyTrail.id,
                title: storyTrail.title,
                description: storyTrail.description,
                imageUrl: storyTrail.imageUrl,
                difficultyLevel: storyTrail.difficultyLevel,
                segments: {
                    create: storyTrail.segments.map(seg => ({
                        id: seg.id,
                        type: seg.type,
                        textContent: seg.textContent,
                        imageUrl: seg.imageUrl,
                        challenge: seg.challenge ? {
                            create: {
                                id: seg.challenge.id,
                                prompt: seg.challenge.prompt,
                                correctAnswerId: seg.challenge.correctAnswerId,
                                // ...other challenge fields
                                choices: {
                                    create: seg.challenge.choices.map(c => ({
                                        id: c.id,
                                        text: c.text,
                                        imageUrl: c.imageUrl,
                                    })),
                                },
                            },
                        } : undefined,
                    })),
                },
            },
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
}