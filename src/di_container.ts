// --- Infrastructure Layer ---
// We import the concrete implementations that our container will build.
import { PostgresAuthRepository } from './features/authentication/infrastructure/repositories/postgres_auth_repository';
import { NodemailerEmailService } from './features/authentication/infrastructure/services/nodemailer_email_service';

// --- Use Cases Layer ---
// We import the use cases that the container will provide to the controllers.
import { SignUpUseCase } from './features/authentication/use-cases/sign_up';
import { SignInUseCase } from './features/authentication/use-cases/sign_in';
import { ForgotPasswordUseCase } from './features/authentication/use-cases/forgot_password';
import { VerifyOtpUseCase } from './features/authentication/use-cases/verify_otp';
import { ResetPasswordUseCase } from './features/authentication/use-cases/reset_password';
import { GetMeUseCase } from './features/authentication/use-cases/get_me';
import { GoogleSignInUseCase } from './features/authentication/use-cases/google_sign_in';

export class DIContainer {

    // --- SINGLETON INSTANCES (INFRASTRUCTURE) ---
    // We create single, private, static instances of our infrastructure components.
    // This ensures there is only ONE auth repository and ONE email service for the whole app.
    private static readonly _authRepository = new PostgresAuthRepository();
    private static readonly _emailService = new NodemailerEmailService();

    // --- GETTERS FOR INFRASTRUCTURE ---
    // Public static methods to safely access our singleton instances.
    public static getAuthRepository() {
        return this._authRepository;
    }

    public static getEmailService() {
        return this._emailService;
    }

    // --- GETTERS FOR USE CASES ---
    // These methods create and return a new instance of a use case.
    // They fetch the required dependencies (like the repository) from our singleton getters.
    public static getSignUpUseCase() {
        return new SignUpUseCase(this.getAuthRepository());
    }

    public static getSignInUseCase() {
        return new SignInUseCase(this.getAuthRepository());
    }

    public static getForgotPasswordUseCase() {
        // This use case needs both the repository and the email service.
        return new ForgotPasswordUseCase(this.getAuthRepository(), this.getEmailService());
    }

    public static getVerifyOtpUseCase() {
        return new VerifyOtpUseCase(this.getAuthRepository());
    }

    public static getResetPasswordUseCase() {
        return new ResetPasswordUseCase(this.getAuthRepository());
    }
    public static getGetMeUseCase() {
        return new GetMeUseCase(this.getAuthRepository());
    }
    public static getGoogleSignInUseCase() {
        return new GoogleSignInUseCase(this.getAuthRepository());
    }
}