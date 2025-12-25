import { ProfileRepository } from '../domain/interfaces/profile_repository';
import { ImageStorageService } from '../domain/interfaces/image_storage_service';

export interface UpdateProfileRequest {
    userId: string;
    fullName?: string;
    // New fields for image handling
    imageFile?: {
        buffer: Buffer;
        mimeType: string;
    };
}

export class UpdateProfileIdentity {
    constructor(
        private readonly repository: ProfileRepository,
        private readonly storageService: ImageStorageService // <--- Inject Storage
    ) { }

    async execute(request: UpdateProfileRequest): Promise<string | null> {
        let avatarUrl: string | undefined = undefined;

        // 1. If there is a file, upload it first
        if (request.imageFile) {
            avatarUrl = await this.storageService.uploadProfilePicture(
                request.userId,
                request.imageFile.buffer,
                request.imageFile.mimeType
            );
        }

        // 2. Update the Database
        // If avatarUrl is defined, it updates. If undefined, it leaves it alone.
        await this.repository.updateIdentity(
            request.userId,
            request.fullName,
            avatarUrl
        );

        return avatarUrl || null; // Return new URL if generated
    }
}