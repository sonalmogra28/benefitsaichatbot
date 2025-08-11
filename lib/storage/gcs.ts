// lib/storage/gcs.ts
import { Storage } from '@google-cloud/storage';

const {
  GCS_BUCKET_NAME,
} = process.env;

if (!GCS_BUCKET_NAME) {
  throw new Error('Missing Google Cloud Storage bucket name.');
}

const storage = new Storage();
const bucket = storage.bucket(GCS_BUCKET_NAME);

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
  async getSignedUrl(path: string, minutes: number = 15): Promise<string> {
    const options = {
      version: 'v4' as const,
      action: 'read' as const,
      expires: Date.now() + minutes * 60 * 1000, // 15 minutes
    };

    const [url] = await bucket.file(path).getSignedUrl(options);
    return url;
  },
};
