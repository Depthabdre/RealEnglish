import { AuthRepository } from '../domain/interfaces/auth_repository';
import { OTP } from '../domain/entities/otp';

export interface VerifyOtpInput {
    email: string;
    otpCode: string;
}

export class VerifyOtpUseCase {
    constructor(private readonly authRepository: AuthRepository) { }

    async execute(input: VerifyOtpInput): Promise<OTP> {
        const { email, otpCode } = input;

        // The use case calls the repository and expects the OTP entity (with the reset token) in return.
        const otpResult = await this.authRepository.verifyOTP({ email, otpCode });

        return otpResult;
    }
}