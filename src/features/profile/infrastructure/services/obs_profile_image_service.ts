import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { ImageStorageService } from '../../domain/interfaces/image_storage_service';

export class ObsProfileImageService implements ImageStorageService {
    private s3Client: S3Client;
    private bucketName: string;
    private endpoint: string;

    constructor() {
        const accessKeyId = process.env.OBS_ACCESS_KEY;
        const secretAccessKey = process.env.OBS_SECRET_KEY;
        this.endpoint = process.env.OBS_ENDPOINT || '';
        this.bucketName = process.env.OBS_BUCKET_NAME || 'real-english-assets';
        const region = process.env.OBS_REGION || 'et-global-1';

        if (!accessKeyId || !secretAccessKey || !this.endpoint) {
            throw new Error("❌ OBS Credentials missing in .env file");
        }

        // Initialize the client (Huawei/Ethio Telecom compatible)
        this.s3Client = new S3Client({
            region: region,
            endpoint: this.endpoint,
            credentials: {
                accessKeyId: accessKeyId,
                secretAccessKey: secretAccessKey
            },
            forcePathStyle: true // CRITICAL for this provider
        });
    }

    async uploadProfilePicture(userId: string, imageBuffer: Buffer, mimeType: string): Promise<string> {
        // 1. Generate a unique filename: profile_pictures/user-id_timestamp.jpg
        const extension = mimeType.split('/')[1] || 'jpg';
        const fileName = `profile_pictures/${userId}_${Date.now()}.${extension}`;

        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: fileName,
            Body: imageBuffer,
            ContentType: mimeType,
            ACL: 'public-read'
        });

        try {
            console.log(`📤 Uploading profile picture for ${userId}...`);

            await this.s3Client.send(command);

            // 2. Construct the Public URL (Virtual Host Style Fix)
            const cleanEndpoint = this.endpoint.replace(/^https?:\/\//, '');
            const publicUrl = `https://${this.bucketName}.${cleanEndpoint}/${fileName}`;

            console.log(`✅ Upload success: ${publicUrl}`);
            return publicUrl;

        } catch (error) {
            console.error(`❌ Error uploading to OBS:`, error);
            throw new Error("Failed to upload profile picture.");
        }
    }
}