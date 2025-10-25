import { User } from '../entities/user';
import { OTP } from '../entities/otp';

export interface AuthRepository {
    signUp(user: { fullName: string; email: string; password_hash: string }): Promise<void>;
    signIn(credentials: { email: string; password_hash: string }): Promise<User>;
    signOut(): Promise<void>;
    forgotPassword(email: string): Promise<string | null>;
    verifyOTP(otpData: { email: string; otpCode: string }): Promise<OTP>;
    resetPassword(resetData: { token: string; newPassword_hash: string }): Promise<void>;
    getMe(userId: string): Promise<User>;
    isLoggedIn(userId: string): Promise<boolean>;
    googleSignIn(googleToken: string): Promise<User>;
}