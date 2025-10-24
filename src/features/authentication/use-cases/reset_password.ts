import { AuthRepository } from '../domain/interfaces/auth_repository';
import * as bcrypt from 'bcrypt';

export interface ResetPasswordInput {
    token: string;
    newPassword: string;
}

export class ResetPasswordUseCase {
    constructor(private readonly authRepository: AuthRepository) { }

    async execute(input: ResetPasswordInput): Promise<void> {
        const { token, newPassword } = input;

        // --- Business Logic ---
        // Rule: The new password must be hashed before being stored.
        // This logic belongs in the use case, not the repository or controller.
        const salt = await bcrypt.genSalt(10);
        const newPassword_hash = await bcrypt.hash(newPassword, salt);

        await this.authRepository.resetPassword({
            token,
            newPassword_hash,
        });
    }
}