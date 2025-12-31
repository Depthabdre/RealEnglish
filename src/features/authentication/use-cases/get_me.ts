import { AuthRepository } from '../domain/interfaces/auth_repository';
import { User } from '../domain/entities/user';

export interface GetMeInput {
    userId: string;
}

export class GetMeUseCase {
    constructor(private readonly authRepository: AuthRepository) { }

    async execute(input: GetMeInput): Promise<User> {
        // The userId would typically be extracted from a validated JWT in a higher layer (controller).
        const user = await this.authRepository.getMe(input.userId);

        // We should not return the password hash, even if the repository provided it.
        // The User entity in the domain layer already makes the password optional, which is good practice.
        return new User(user.id, user.fullName, user.level, user.email);
    }
}