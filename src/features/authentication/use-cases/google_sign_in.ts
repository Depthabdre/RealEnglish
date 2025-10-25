import { AuthRepository } from '../domain/interfaces/auth_repository';
import { User } from '../domain/entities/user';

export interface GoogleSignInInput {
    token: string;
}

export class GoogleSignInUseCase {
    constructor(private readonly authRepository: AuthRepository) { }

    async execute(input: GoogleSignInInput): Promise<User> {
        // The use case's job is simple: just pass the token to the repository.
        const user = await this.authRepository.googleSignIn(input.token);
        return user;
    }
}