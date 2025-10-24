import { AuthRepository } from '../domain/interfaces/auth_repository';
import { User } from '../domain/entities/user';

// This use case may not need an input DTO if all logic is handled by the repository
// (e.g., repository uses Google's library to get the token from the request).

export class GoogleSignInUseCase {
    constructor(private readonly authRepository: AuthRepository) { }

    async execute(): Promise<User> {
        const user = await this.authRepository.googleSignIn();
        return user;
    }
}