// The import path is now corrected to point to the 'interfaces' directory
import { AuthRepository } from '../domain/interfaces/auth_repository';
import { User } from '../domain/entities/user';
import * as bcrypt from 'bcrypt';

export interface SignUpInput {
    fullName: string;
    email: string;
    password: string;
}

export class SignUpUseCase {
    constructor(private readonly authRepository: AuthRepository) { }

    async execute(input: SignUpInput): Promise<void> {
        const { fullName, email, password } = input;

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        await this.authRepository.signUp({
            fullName,
            email,
            password_hash,
        });
    }
}