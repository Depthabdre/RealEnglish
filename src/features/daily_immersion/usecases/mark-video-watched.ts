import { ImmersionRepository } from '../domain/interface/immersion-repository';
import { StreakService } from '../../profile/domain/services/streak_service'; // Import StreakService

export class MarkVideoWatchedUseCase {
    constructor(
        private readonly immersionRepo: ImmersionRepository,
        private readonly streakService: StreakService // <--- Inject it
    ) { }

    async execute(params: { userId: string, shortId: string }): Promise<void> {
        // 1. Mark video as watched (Existing Logic)
        await this.immersionRepo.markAsWatched(params.userId, params.shortId);

        // 2. TRIGGER STREAK UPDATE (New Logic)
        // We assume watching a video counts as "practice"
        await this.streakService.updateStreak(params.userId);
        console.log(`👉 User ${params.userId} Mark As Watched for ${params.shortId}.`);
    }
}