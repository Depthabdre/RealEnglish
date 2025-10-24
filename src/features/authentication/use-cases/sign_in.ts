// The import path is now corrected to point to the 'interfaces' directory
import { AuthRepository } from '../domain/interfaces/auth_repository';
import { User } from '../domain/entities/user';

export interface SignInInput {
    email: string;
    password: string;
}

export class SignInUseCase {
    constructor(private readonly authRepository: AuthRepository) { }

    async execute(input: SignInInput): Promise<User> {
        const { email, password } = input;

        const user = await this.authRepository.signIn({
            email,
            password_hash: password // Passing raw password for the repository to handle comparison
        });

        return user;
    }
}