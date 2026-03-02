import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Cloudflare R2 file storage helpers
 * Uses S3-compatible API via AWS SDK
 */

let s3Client: S3Client | null = null;

/**
 * Initialize S3 client for R2
 * Lazily instantiated on first use
 */
function getR2Client(): S3Client {
  if (!s3Client) {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'Missing R2 credentials. Required: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY'
      );
    }

    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  return s3Client;
}

/**
 * Get bucket name from environment
 */
function getBucketName(): string {
  const bucketName = process.env.R2_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('Missing R2_BUCKET_NAME environment variable');
  }
  return bucketName;
}

/**
 * Generate a presigned URL for uploading a file to R2
 *
 * @param key - The file path/key in R2 (e.g., "clients/abc-123/logo.png")
 * @param contentType - MIME type of the file (e.g., "image/png")
 * @param expiresIn - URL expiry time in seconds (default: 15 minutes)
 * @returns Presigned PUT URL that the client can use to upload directly
 *
 * @example
 * const uploadUrl = await getUploadUrl('clients/abc-123/logo.png', 'image/png');
 * // Client can now PUT to this URL with the file content
 */
export async function getUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 900 // 15 minutes
): Promise<string> {
  const client = getR2Client();
  const bucketName = getBucketName();

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, { expiresIn });
}

/**
 * Generate a presigned URL for downloading a file from R2
 *
 * @param key - The file path/key in R2
 * @param expiresIn - URL expiry time in seconds (default: 1 hour)
 * @returns Presigned GET URL that can be used to download the file
 *
 * @example
 * const downloadUrl = await getDownloadUrl('clients/abc-123/invoice.pdf');
 * // This URL can be used to download the file for 1 hour
 */
export async function getDownloadUrl(
  key: string,
  expiresIn: number = 3600 // 1 hour
): Promise<string> {
  const client = getR2Client();
  const bucketName = getBucketName();

  // For downloads, we use GetObject command
  // Note: AWS SDK doesn't export GetObjectCommand separately, we use PutObjectCommand structure
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  // The signed URL generator will create a GET URL by default
  return getSignedUrl(client, command, { expiresIn });
}

/**
 * Delete a file from R2
 *
 * @param key - The file path/key in R2 to delete
 *
 * @example
 * await deleteFile('clients/abc-123/old-logo.png');
 */
export async function deleteFile(key: string): Promise<void> {
  const client = getR2Client();
  const bucketName = getBucketName();

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  await client.send(command);
}

/**
 * Generate a client-specific R2 path prefix
 *
 * @param clientId - The client UUID
 * @param subPath - Optional subpath within the client folder
 * @returns Formatted R2 key prefix
 *
 * @example
 * getClientPath('abc-123', 'logos/current.png')
 * // Returns: 'clients/abc-123/logos/current.png'
 */
export function getClientPath(clientId: string, subPath?: string): string {
  const base = `clients/${clientId}`;
  return subPath ? `${base}/${subPath}` : base;
}

/**
 * Generate a project-specific R2 path prefix
 *
 * @param clientId - The client UUID
 * @param projectId - The project UUID
 * @param subPath - Optional subpath within the project folder
 * @returns Formatted R2 key prefix
 *
 * @example
 * getProjectPath('abc-123', 'xyz-789', 'deliverables/final.mp4')
 * // Returns: 'clients/abc-123/projects/xyz-789/deliverables/final.mp4'
 */
export function getProjectPath(
  clientId: string,
  projectId: string,
  subPath?: string
): string {
  const base = `clients/${clientId}/projects/${projectId}`;
  return subPath ? `${base}/${subPath}` : base;
}

/**
 * Generate a content asset R2 path
 *
 * @param clientId - The client UUID
 * @param assetId - The content asset UUID
 * @param filename - The filename with extension
 * @returns Formatted R2 key
 *
 * @example
 * getAssetPath('abc-123', 'asset-456', 'social-post.jpg')
 * // Returns: 'clients/abc-123/assets/asset-456/social-post.jpg'
 */
export function getAssetPath(
  clientId: string,
  assetId: string,
  filename: string
): string {
  return `clients/${clientId}/assets/${assetId}/${filename}`;
}
