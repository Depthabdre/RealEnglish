import { AuthRepository } from '../domain/interfaces/auth_repository';
import { EmailService } from '../domain/interfaces/email_service';

export interface ForgotPasswordInput {
    email: string;
}

export class ForgotPasswordUseCase {
    // Now we inject BOTH the repository and the email service
    constructor(
        private readonly authRepository: AuthRepository,
        private readonly emailService: EmailService
    ) { }

    async execute(input: ForgotPasswordInput): Promise<void> {
        // 1. Call the repository to create the OTP and save it to the DB.
        //    The repository returns the OTP code it just created.
        const otp = await this.authRepository.forgotPassword(input.email);

        // 2. If an OTP was generated (meaning the user exists),
        //    call the email service to send it.
        if (otp) {
            await this.emailService.sendPasswordResetOtp(input.email, otp);
        }

        // The use case silently succeeds even if the user doesn't exist
        // to prevent attackers from checking which emails are registered.
    }
}