import { PrismaClient } from '@prisma/client';

// =================================================================
// AUTHENTICATION FEATURE IMPORTS
// =================================================================
// --- Infrastructure ---
import { PostgresAuthRepository } from './features/authentication/infrastructure/repositories/postgres_auth_repository';
import { NodemailerEmailService } from './features/authentication/infrastructure/services/nodemailer_email_service';
// --- Use Cases ---
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
// --- Infrastructure ---
import { PrismaStoryTrailRepository } from './features/story_trails/infrastructure/database/prisma-story-trail-repository';
import { PrismaUserProgressRepository } from './features/story_trails/infrastructure/database/prisma-user-progress-repository';
import { PrismaUserRepository } from './features/story_trails/infrastructure/database/prisma-user-repository';
import { GeminiTextToSpeechService } from './features/story_trails/infrastructure/ai/gemini-text-to-speech-service';
import { GeminiStoryGenerationService } from './features/story_trails/infrastructure/ai/gemini-story-generation-service';
// --- Use Cases ---
import { GetNextStoryTrailUseCase } from './features/story_trails/usecases/get-next-story-trail';
import { GetStoryTrailByIdUseCase } from './features/story_trails/usecases/get-story-trail-by-id';
import { MarkStoryTrailCompletedUseCase } from './features/story_trails/usecases/mark-story-trail-completed';
import { GetAudioForSegmentUseCase } from './features/story_trails/usecases/get-audio-for-segment';
import { ImmersionRepository } from './features/daily_immersion/domain/interface/immersion-repository';
import { VideoHarvestingService } from './features/daily_immersion/domain/interface/video-harvesting-service';
import { YouTubeHarvestingService } from './features/daily_immersion/infrastructure/external/youtube-harvesting-service';
import { PrismaImmersionRepository } from './features/daily_immersion/infrastructure/database/prisma-immersion-repository';
import { GetPersonalizedFeedUseCase } from './features/daily_immersion/usecases/get-personalized-feed';
import { HarvestYouTubeShortsUseCase } from './features/daily_immersion/usecases/harvest-youtube-shorts';
import { ToggleSaveVideoUseCase } from './features/daily_immersion/usecases/toggle-save-video';
import { MarkVideoWatchedUseCase } from './features/daily_immersion/usecases/mark-video-watched';
import { GetSavedShortsUseCase } from './features/daily_immersion/usecases/get-saved-shorts';

export class DIContainer {

    // --- SHARED INFRASTRUCTURE (SINGLETONS) ---
    private static readonly _prismaClient = new PrismaClient();

    // --- AUTHENTICATION INFRASTRUCTURE (SINGLETONS) ---
    private static readonly _authRepository = new PostgresAuthRepository(this._prismaClient);
    private static readonly _emailService = new NodemailerEmailService();

    // --- STORY TRAILS INFRASTRUCTURE (SINGLETONS) ---
    private static readonly _storyTrailRepository = new PrismaStoryTrailRepository(this._prismaClient);
    private static readonly _userProgressRepository = new PrismaUserProgressRepository(this._prismaClient);
    private static readonly _userRepository = new PrismaUserRepository(this._prismaClient);

    // THE FIX IS HERE: We must pass the API key from the environment to the constructor.
    // The '!' tells TypeScript we are sure that this environment variable will be present at runtime.
    private static readonly _textToSpeechService = new GeminiTextToSpeechService(process.env.GEMINI_API_KEY!);

    private static readonly _storyGenerationService = new GeminiStoryGenerationService(this._storyTrailRepository);
    // (In your DIContainer file)
    public static getImmersionRepository(): ImmersionRepository {
        // REMOVED THE () AFTER _prismaClient
        return new PrismaImmersionRepository(this._prismaClient);
    }

    public static getVideoHarvestingService(): VideoHarvestingService {
        return new YouTubeHarvestingService();
    }

    // Add these to your DIContainer class

    // --- Daily Immersion Use Cases ---

    public static getGetPersonalizedFeedUseCase() {
        return new GetPersonalizedFeedUseCase(
            this.getImmersionRepository(),
            // ADD THIS: Inject the Harvester service
            this.getVideoHarvestingService()
        );
    }

    public static getHarvestYouTubeShortsUseCase() {
        return new HarvestYouTubeShortsUseCase(
            this.getImmersionRepository(),
            this.getVideoHarvestingService()
        );
    }

    public static getToggleSaveVideoUseCase() {
        return new ToggleSaveVideoUseCase(this.getImmersionRepository());
    }

    public static getMarkVideoWatchedUseCase() {
        return new MarkVideoWatchedUseCase(this.getImmersionRepository());
    }

    public static getGetSavedShortsUseCase() {
        return new GetSavedShortsUseCase(this.getImmersionRepository());
    }

    // =================================================================
    // PUBLIC GETTERS FOR USE CASES
    // =================================================================

    // --- Authentication Use Case Getters ---
    public static getSignUpUseCase() { return new SignUpUseCase(this._authRepository); }
    public static getSignInUseCase() { return new SignInUseCase(this._authRepository); }
    public static getForgotPasswordUseCase() { return new ForgotPasswordUseCase(this._authRepository, this._emailService); }
    public static getVerifyOtpUseCase() { return new VerifyOtpUseCase(this._authRepository); }
    public static getResetPasswordUseCase() { return new ResetPasswordUseCase(this._authRepository); }
    public static getGetMeUseCase() { return new GetMeUseCase(this._authRepository); }
    public static getGoogleSignInUseCase() { return new GoogleSignInUseCase(this._authRepository); }

    // --- Story Trails Use Case Getters ---
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
            this._storyTrailRepository
        );
    }

    public static getGetAudioForSegmentUseCase() {
        return new GetAudioForSegmentUseCase(this._storyTrailRepository, this._textToSpeechService);
    }
}