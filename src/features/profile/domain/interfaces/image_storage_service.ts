export interface ImageStorageService {
    /**
     * Uploads a profile image and returns the public URL.
     * @param userId - Used to name the file uniquely.
     * @param imageBuffer - The binary data.
     * @param mimeType - e.g. "image/jpeg" or "image/png".
     */
    uploadProfilePicture(userId: string, imageBuffer: Buffer, mimeType: string): Promise<string>;
}