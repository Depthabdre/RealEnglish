import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export class ObsStorageService {
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

        // Initialize the client
        this.s3Client = new S3Client({
            region: region,
            endpoint: this.endpoint,
            credentials: {
                accessKeyId: accessKeyId,
                secretAccessKey: secretAccessKey
            },
            // CRITICAL: This is required for Ethio Telecom / Huawei Cloud OBS
            // It forces the URL to look like: endpoint/bucket/file
            // instead of: bucket.endpoint/file (which often fails on local clouds)
            forcePathStyle: true
        });
    }

    /**
     * Uploads an audio buffer to OBS and returns the Public URL.
     * @param fileName - The path inside the bucket (e.g. "stories/123.wav")
     * @param fileBuffer - The actual audio data
     */
    async uploadAudio(fileName: string, fileBuffer: Buffer): Promise<string> {
        // 1. Prepare the Upload Command
        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: fileName,
            Body: fileBuffer,
            ContentType: 'audio/wav',
            ACL: 'public-read'
        });


        try {
            // 2. Send to Cloud
            console.log(`☁️ Uploading ${fileName} to OBS...`);
            await this.s3Client.send(command);

            // --- THE FIX STARTS HERE ---

            // 1. Remove 'https://' from the endpoint string to handle it cleanly
            const cleanEndpoint = this.endpoint.replace(/^https?:\/\//, '');

            // 2. Construct Virtual Host Style URL: https://{bucket}.{endpoint}/{file}
            // Result: https://real-english-assets.obsv3.et-global-1.ethiotelecom.et/stories/xyz.wav
            const publicUrl = `https://${this.bucketName}.${cleanEndpoint}/${fileName}`;

            return publicUrl;
            // ---------------------------
        } catch (error) {
            console.error("❌ Error uploading to OBS:", error);
            throw new Error("Failed to upload audio to cloud storage.");
        }
    }
}