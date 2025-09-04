// lib/storage/gcs.ts
import { Storage } from '@google-cloud/storage';

// Prioritize GCS_BUCKET_NAME for explicit override, but fall back to the public Firebase one.
const bucketName = process.env.GCS_BUCKET_NAME || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

if (!bucketName) {
  // This log will clearly state what's missing during the build.
  console.error("GCS bucket name not configured. Set GCS_BUCKET_NAME or NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET environment variable.");
  // We still throw an error because the module is unusable without a bucket.
  throw new Error('Missing Google Cloud Storage bucket name. Check build logs for configuration details.');
}


const storage = new Storage();
const bucket = storage.bucket(bucketName);

export const gcsFileStorage = {
  /**
   * Uploads a file to Google Cloud Storage.
   *
   * @param destination The path and filename in the bucket (e.g., 'documents/user-123/report.pdf').
   * @param contents The contents of the file as a Buffer.
   * @returns The public URL of the uploaded file.
   */
  async upload(destination: string, contents: Buffer): Promise<string> {
    const file = bucket.file(destination);
    await file.save(contents);
    // Note: publicUrl() only works if the object is public. 
    // For private objects, use getSignedUrl().
    return file.publicUrl();
  },

  /**
   * Downloads a file from Google Cloud Storage.
   *
   * @param path The path to the file in the bucket.
   * @returns The contents of the file as a Buffer.
   */
  async download(path: string): Promise<Buffer> {
    const [contents] = await bucket.file(path).download();
    return contents;
  },

  /**
   * Deletes a file from Google Cloud Storage.
   *
   * @param path The path to the file in the bucket.
   */
  async delete(path: string): Promise<void> {
    await bucket.file(path).delete();
  },

  /**
   * Generates a signed URL for temporary access to a private file.
   * This is useful for allowing users to download their own private documents.
   *
   * @param path The path to the file in the bucket.
   * @param minutes The number of minutes the URL should be valid for.
   * @returns A signed URL string.
   */
  async getSignedUrl(path: string, minutes = 15): Promise<string> {
    const options = {
      version: 'v4' as const,
      action: 'read' as const,
      expires: Date.now() + minutes * 60 * 1000, // 15 minutes
    };

    const [url] = await bucket.file(path).getSignedUrl(options);
    return url;
  },
};
