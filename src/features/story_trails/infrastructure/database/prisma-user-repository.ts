import { PrismaClient } from '@prisma/client';
import { UserRepository } from '../../domain/interface/user-repository';
import { User } from '../../../authentication/domain/entities/user';

export class PrismaUserRepository implements UserRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async findById(userId: string): Promise<User | null> {
        const userData = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!userData) return null;

        // THE FIX: The arguments now match your User constructor order exactly:
        // 1. id (string)
        // 2. fullName (string)
        // 3. level (number)
        // 4. email (string)
        return new User(
            userData.id,
            userData.fullName,
            userData.level,
            userData.email
        );
    }

    async updateLevel(userId: string, newLevel: number): Promise<void> {
        await this.prisma.user.update({
            where: { id: userId },
            data: { level: newLevel },
        });
    }
}