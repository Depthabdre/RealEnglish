export interface EmailService {
    sendPasswordResetOtp(email: string, otp: string): Promise<void>;
}