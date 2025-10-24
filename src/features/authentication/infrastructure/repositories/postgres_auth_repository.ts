import { AuthRepository } from '../../domain/interfaces/auth_repository';
import { User } from '../../domain/entities/user';
import { OTP } from '../../domain/entities/otp';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import crypto from "crypto";

export class PostgresAuthRepository implements AuthRepository {
    // Instantiate the Prisma Client
    private readonly prisma = new PrismaClient();

    async signUp(userData: { fullName: string; email: string; password_hash: string; }): Promise<void> {
        try {
            await this.prisma.user.create({
                data: {
                    fullName: userData.fullName,
                    email: userData.email,
                    password: userData.password_hash,
                },
            });
        } catch (error: any) {
            // Prisma throws a specific error for unique constraint violations
            if (error.code === 'P2002') {
                throw new Error('User with this email already exists.');
            }
            throw error;
        }
    }

    async signIn(credentials: { email: string; password_hash: string; }): Promise<User> {
        const user = await this.prisma.user.findUnique({
            where: { email: credentials.email },
        });

        if (!user) {
            throw new Error('Invalid email or password.');
        }

        const isMatch = await bcrypt.compare(credentials.password_hash, user.password);
        if (!isMatch) {
            throw new Error('Invalid email or password.');
        }

        return new User(user.id, user.fullName, user.email);
    }

    async forgotPassword(email: string): Promise<string | null> {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) {
            return null; // Return null if user doesn't exist
        }
        // ... logic to delete old tokens ...
        const otpCode = crypto.randomInt(100000, 1000000).toString(); // 6-digit secure OTP
        const expires = new Date(Date.now() + 10 * 60 * 1000); // expires in 10 minutes
        await this.prisma.passwordResetToken.create({
            data: { email, token: otpCode, expires },
        });
        return otpCode; // Return the generated OTP
    }

    async verifyOTP(otpData: { email: string; otpCode: string; }): Promise<OTP> {
        const resetRequest = await this.prisma.passwordResetToken.findFirst({
            where: { email: otpData.email, token: otpData.otpCode },
        });

        if (!resetRequest) {
            throw new Error('Invalid OTP.');
        }

        if (new Date() > resetRequest.expires) {
            throw new Error('OTP has expired.');
        }

        // Generate a longer, more secure token for the actual reset link/step
        const finalResetToken = uuidv4();
        await this.prisma.passwordResetToken.update({
            where: { id: resetRequest.id },
            data: { token: finalResetToken, expires: new Date(new Date().getTime() + 60 * 60000) }, // 1 hour to reset
        });

        return new OTP(resetRequest.email, finalResetToken);
    }

    async resetPassword(resetData: { token: string; newPassword_hash: string; }): Promise<void> {
        const resetRequest = await this.prisma.passwordResetToken.findUnique({
            where: { token: resetData.token },
        });

        if (!resetRequest || new Date() > resetRequest.expires) {
            throw new Error('Invalid or expired reset token.');
        }

        await this.prisma.user.update({
            where: { email: resetRequest.email },
            data: { password: resetData.newPassword_hash },
        });

        // Clean up the token now that it has been used
        await this.prisma.passwordResetToken.delete({ where: { id: resetRequest.id } });
    }

    async getMe(userId: string): Promise<User> {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new Error('User not found.');
        }
        return new User(user.id, user.fullName, user.email);
    }

    // --- You would continue to implement the remaining methods ---

    async googleSignIn(): Promise<User> {
        throw new Error("Method not implemented.");
    }

    async signOut(): Promise<void> {
        return Promise.resolve();
    }

    async isLoggedIn(userId: string): Promise<boolean> {
        const count = await this.prisma.user.count({ where: { id: userId } });
        return count > 0;
    }
}