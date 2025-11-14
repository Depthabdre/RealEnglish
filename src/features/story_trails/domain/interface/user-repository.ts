// Assuming the User entity can be imported from the auth feature
import { User } from '../../../authentication/domain/entities/user';

export interface UserRepository {
    /**
     * Finds a user by their unique ID.
     */
    findById(userId: string): Promise<User | null>;

    /**
     * Updates the level for a given user.
     */
    updateLevel(userId: string, newLevel: number): Promise<void>;
}