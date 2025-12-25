import { PrismaClient } from '@prisma/client';

// =================================================================
// AUTHENTICATION FEATURE IMPORTS
// =================================================================
import { PostgresAuthRepository } from './features/authentication/infrastructure/repositories/postgres_auth_repository';
import { NodemailerEmailService } from './features/authentication/infrastructure/services/nodemailer_email_service';
import { SignUpUseCase } from './features/authentication/use-cases/sign_up';
import { SignInUseCase } from './features/authentication/use-cases/sign_in';
import { ForgotPasswordUseCase } from './features/authentication/use-cases/forgot_password';
import { VerifyOtpUseCase } from './features/authentication/use-cases/verify_otp';
import { ResetPasswordUseCase } from './features/authentication/use-cases/reset_password';
import { GetMeUseCase } from './features/authentication/use-cases/get_me';
import { GoogleSignInUseCase } from './features/authentication/use-cases/google_sign_in';

// =================================================================
// STORY TRAILS FEATURE IMPORTS
// =================================================================
import { PrismaStoryTrailRepository } from './features/story_trails/infrastructure/database/prisma-story-trail-repository';
import { PrismaUserProgressRepository } from './features/story_trails/infrastructure/database/prisma-user-progress-repository';
import { PrismaUserRepository } from './features/story_trails/infrastructure/database/prisma-user-repository';
import { GeminiTextToSpeechService } from './features/story_trails/infrastructure/ai/gemini-text-to-speech-service';
import { GeminiStoryGenerationService } from './features/story_trails/infrastructure/ai/gemini-story-generation-service';
import { GetNextStoryTrailUseCase } from './features/story_trails/usecases/get-next-story-trail';
import { GetStoryTrailByIdUseCase } from './features/story_trails/usecases/get-story-trail-by-id';
import { MarkStoryTrailCompletedUseCase } from './features/story_trails/usecases/mark-story-trail-completed';
import { GetAudioForSegmentUseCase } from './features/story_trails/usecases/get-audio-for-segment';

// =================================================================
// DAILY IMMERSION FEATURE IMPORTS
// =================================================================
import { ImmersionRepository } from './features/daily_immersion/domain/interface/immersion-repository';
import { VideoHarvestingService } from './features/daily_immersion/domain/interface/video-harvesting-service';
import { YouTubeHarvestingService } from './features/daily_immersion/infrastructure/external/youtube-harvesting-service';
import { PrismaImmersionRepository } from './features/daily_immersion/infrastructure/database/prisma-immersion-repository';
import { GetPersonalizedFeedUseCase } from './features/daily_immersion/usecases/get-personalized-feed';
import { HarvestYouTubeShortsUseCase } from './features/daily_immersion/usecases/harvest-youtube-shorts';
import { ToggleSaveVideoUseCase } from './features/daily_immersion/usecases/toggle-save-video';
import { MarkVideoWatchedUseCase } from './features/daily_immersion/usecases/mark-video-watched';
import { GetSavedShortsUseCase } from './features/daily_immersion/usecases/get-saved-shorts';

// =================================================================
// PROFILE FEATURE IMPORTS (NEW)
// =================================================================
import { PrismaProfileRepository } from './features/profile/infrastructure/repositories/prisma_profile_repository';
import { GetUserProfile } from './features/profile/usecases/get_user_profile';
import { UpdateProfileIdentity } from './features/profile/usecases/update_profile_identity';
import { StreakService } from './features/profile/domain/services/streak_service';
import { ObsProfileImageService } from './features/profile/infrastructure/services/obs_profile_image_service';


export class DIContainer {

    // --- SHARED INFRASTRUCTURE (SINGLETONS) ---
    private static readonly _prismaClient = new PrismaClient();

    // --- AUTHENTICATION INFRASTRUCTURE ---
    private static readonly _authRepository = new PostgresAuthRepository(this._prismaClient);
    private static readonly _emailService = new NodemailerEmailService();

    // --- STORY TRAILS INFRASTRUCTURE ---
    private static readonly _storyTrailRepository = new PrismaStoryTrailRepository(this._prismaClient);
    private static readonly _userProgressRepository = new PrismaUserProgressRepository(this._prismaClient);
    private static readonly _userRepository = new PrismaUserRepository(this._prismaClient);
    private static readonly _textToSpeechService = new GeminiTextToSpeechService(process.env.GEMINI_API_KEY!);
    private static readonly _storyGenerationService = new GeminiStoryGenerationService(this._storyTrailRepository);

    // --- DAILY IMMERSION INFRASTRUCTURE ---
    // (Managed via Getters below to match your pattern, or static properties if preferred)

    // --- PROFILE INFRASTRUCTURE (NEW) ---

    private static readonly _profileRepository = new PrismaProfileRepository(this._prismaClient);
    private static readonly _profileImageService = new ObsProfileImageService(); // <--- NEW

    // =================================================================
    // PUBLIC GETTERS
    // =================================================================

    // --- Auth ---
    public static getSignUpUseCase() { return new SignUpUseCase(this._authRepository); }
    public static getSignInUseCase() { return new SignInUseCase(this._authRepository); }
    public static getForgotPasswordUseCase() { return new ForgotPasswordUseCase(this._authRepository, this._emailService); }
    public static getVerifyOtpUseCase() { return new VerifyOtpUseCase(this._authRepository); }
    public static getResetPasswordUseCase() { return new ResetPasswordUseCase(this._authRepository); }
    public static getGetMeUseCase() { return new GetMeUseCase(this._authRepository); }
    public static getGoogleSignInUseCase() { return new GoogleSignInUseCase(this._authRepository); }

    // --- Story Trails ---
    public static getGetNextStoryTrailUseCase() {
        return new GetNextStoryTrailUseCase(this._storyTrailRepository, this._storyGenerationService);
    }
    public static getGetStoryTrailByIdUseCase() {
        return new GetStoryTrailByIdUseCase(this._storyTrailRepository);
    }
    public static getMarkStoryTrailCompletedUseCase() {
        return new MarkStoryTrailCompletedUseCase(
            this._userProgressRepository,
            this._userRepository,
            this._storyTrailRepository,
            this.getStreakService()
        );
    }
    public static getGetAudioForSegmentUseCase() {
        return new GetAudioForSegmentUseCase(this._storyTrailRepository, this._textToSpeechService);
    }

    // --- Daily Immersion ---
    public static getImmersionRepository(): ImmersionRepository {
        return new PrismaImmersionRepository(this._prismaClient);
    }
    public static getVideoHarvestingService(): VideoHarvestingService {
        return new YouTubeHarvestingService();
    }
    public static getGetPersonalizedFeedUseCase() {
        return new GetPersonalizedFeedUseCase(this.getImmersionRepository(), this.getVideoHarvestingService());
    }
    public static getHarvestYouTubeShortsUseCase() {
        return new HarvestYouTubeShortsUseCase(this.getImmersionRepository(), this.getVideoHarvestingService());
    }
    public static getToggleSaveVideoUseCase() {
        return new ToggleSaveVideoUseCase(this.getImmersionRepository());
    }
    public static getMarkVideoWatchedUseCase() {
        return new MarkVideoWatchedUseCase(this.getImmersionRepository(), this.getStreakService());
    }
    public static getGetSavedShortsUseCase() {
        return new GetSavedShortsUseCase(this.getImmersionRepository());
    }

    // --- Profile (NEW) ---
    public static getGetUserProfileUseCase() {
        return new GetUserProfile(this._profileRepository);
    }

    public static getUpdateProfileIdentityUseCase() {
        return new UpdateProfileIdentity(
            this._profileRepository,
            this._profileImageService // <--- Inject here
        );
    }

    // Create the Service Instance
    private static readonly _streakService = new StreakService(this._profileRepository);

    // Expose it
    public static getStreakService() {
        return this._streakService;
    }
}