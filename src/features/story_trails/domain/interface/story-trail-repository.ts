import { StoryTrail } from '../entities/story-trail';
import { StorySegment } from '../entities/story-segment';

export interface StoryTrailRepository {
    /**
     * Finds a story trail by its unique ID.
     */
    findById(trailId: string): Promise<StoryTrail | null>;

    /**
     * Finds the first uncompleted story trail for a specific user and difficulty level.
     */
    findNextIncompleteByLevel(level: number, userId: string): Promise<StoryTrail | null>;

    /**
     * Finds a single story segment by its unique ID.
     * (Needed for the on-the-fly audio generation endpoint).
     */
    findSegmentById(segmentId: string): Promise<StorySegment | null>;

    /**
     * Saves a new story trail to the database.
     */
    save(storyTrail: StoryTrail): Promise<void>;

    findFirstByLevel(level: number): Promise<StoryTrail | null>;
}