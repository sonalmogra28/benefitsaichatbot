
import { adminStorage } from '@/lib/firebase/admin';

/**
 * Get the total size of all files in a Firebase Storage bucket.
 *
 * @param bucketName The name of the bucket to analyze.
 * @returns The total size of all files in bytes.
 */
export async function getBucketSize(bucketName?: string): Promise<number> {
  const bucket = bucketName ? adminStorage.bucket(bucketName) : adminStorage.bucket();
  const [files] = await bucket.getFiles();

  let totalSize = 0;
  for (const file of files) {
    totalSize += Number(file.metadata.size);
  }

  return totalSize;
}
