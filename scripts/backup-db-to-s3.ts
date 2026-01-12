import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, unlink } from 'fs/promises';
import { resolve } from 'path';

const execAsync = promisify(exec);

// Load environment variables
const {
  DATABASE_URL,
  AWS_S3_BACKUP_BUCKET,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_REGION = 'us-east-1',
} = process.env;

// Validate required environment variables
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set');
  process.exit(1);
}

if (!AWS_S3_BACKUP_BUCKET) {
  console.error('❌ AWS_S3_BACKUP_BUCKET is not set');
  process.exit(1);
}

if (!AWS_ACCESS_KEY_ID) {
  console.error('❌ AWS_ACCESS_KEY_ID is not set');
  process.exit(1);
}

if (!AWS_SECRET_ACCESS_KEY) {
  console.error('❌ AWS_SECRET_ACCESS_KEY is not set');
  process.exit(1);
}

// Initialize S3 client
const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Generate backup filename with timestamp
 */
function generateBackupFilename(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `Reposignal_backup_${year}-${month}-${day}_${hours}-${minutes}-${seconds}.sql`;
}

/**
 * Create a PostgreSQL database dump
 */
async function createDatabaseDump(filename: string): Promise<string> {
  console.log('📦 Creating database dump...');
  
  const dumpPath = resolve(process.cwd(), filename);
  
  try {
    // Use pg_dump to create the backup
    const command = `pg_dump "${DATABASE_URL}" > "${dumpPath}"`;
    await execAsync(command);
    
    console.log(`✅ Database dump created: ${filename}`);
    return dumpPath;
  } catch (error) {
    console.error('❌ Failed to create database dump:', error);
    throw error;
  }
}

/**
 * Upload file to S3
 */
async function uploadToS3(filePath: string, filename: string): Promise<void> {
  console.log('☁️  Uploading to S3...');
  
  try {
    const fileContent = await readFile(filePath);
    
    const command = new PutObjectCommand({
      Bucket: AWS_S3_BACKUP_BUCKET,
      Key: filename,
      Body: fileContent,
      ContentType: 'application/sql',
      Metadata: {
        'backup-date': new Date().toISOString(),
        'database': 'reposignal',
      },
    });
    
    await s3Client.send(command);
    
    console.log(`✅ Backup uploaded to S3: s3://${AWS_S3_BACKUP_BUCKET}/${filename}`);
  } catch (error) {
    console.error('❌ Failed to upload to S3:', error);
    throw error;
  }
}

/**
 * Clean up temporary dump file
 */
async function cleanupDumpFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
    console.log('🧹 Temporary dump file cleaned up');
  } catch (error) {
    console.error('⚠️  Failed to clean up dump file:', error);
  }
}

/**
 * Main backup function
 */
async function backupDatabase(): Promise<void> {
  const startTime = Date.now();
  console.log('🚀 Starting database backup process...');
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  
  const filename = generateBackupFilename();
  let dumpPath: string | null = null;
  
  try {
    // Step 1: Create database dump
    dumpPath = await createDatabaseDump(filename);
    
    // Step 2: Upload to S3
    await uploadToS3(dumpPath, filename);
    
    // Step 3: Clean up
    await cleanupDumpFile(dumpPath);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✨ Backup completed successfully in ${duration}s`);
    console.log(`📍 Location: s3://${AWS_S3_BACKUP_BUCKET}/${filename}`);
    
  } catch (error) {
    console.error('💥 Backup process failed:', error);
    
    // Clean up on error
    if (dumpPath) {
      await cleanupDumpFile(dumpPath);
    }
    
    process.exit(1);
  }
}

// Run the backup
backupDatabase();
