# Database Backup Scripts

## S3 Backup Script

Automated PostgreSQL database backup to AWS S3.

### Setup

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Configure environment variables in `.env`:**
   ```env
   # Database
   DATABASE_URL=postgresql://user:password@host:port/database
   
   # AWS S3 Backup Configuration
   AWS_S3_BACKUP_BUCKET=your-backup-bucket-name
   AWS_ACCESS_KEY_ID=your-access-key-id
   AWS_SECRET_ACCESS_KEY=your-secret-access-key
   AWS_REGION=us-east-1
   ```

3. **Ensure PostgreSQL client tools are installed:**
   - The script uses `pg_dump` which comes with PostgreSQL
   - On Windows: Install PostgreSQL and add it to PATH
   - On Linux: `sudo apt-get install postgresql-client`
   - On macOS: `brew install postgresql`

### Usage

**Manual backup:**
```bash
bun run db:backup
```

**Automated backups with cron (Linux/macOS):**
```bash
# Daily backup at 2 AM
0 2 * * * cd /path/to/reposignal-backend && bun run db:backup >> /var/log/reposignal-backup.log 2>&1
```

**Automated backups with Task Scheduler (Windows):**
1. Open Task Scheduler
2. Create a new task
3. Set trigger (e.g., daily at 2 AM)
4. Set action: Run `bun run db:backup` in your project directory

### Backup Naming Convention

Backups are named using the format:
```
Reposignal_backup_YYYY-MM-DD_HH-MM-SS.sql
```

Example: `Reposignal_backup_2026-01-12_14-30-45.sql`

### Features

- ✅ Automatic PostgreSQL database dumps
- ✅ Secure upload to S3 with IAM credentials
- ✅ Timestamped backup files
- ✅ Automatic cleanup of temporary files
- ✅ Comprehensive error handling and logging
- ✅ Metadata tagging in S3

### S3 Bucket Setup

1. Create an S3 bucket in AWS Console
2. Create an IAM user with programmatic access
3. Attach the following policy to the IAM user:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-backup-bucket-name",
        "arn:aws:s3:::your-backup-bucket-name/*"
      ]
    }
  ]
}
```

### Troubleshooting

**Error: `pg_dump: command not found`**
- Install PostgreSQL client tools
- Ensure `pg_dump` is in your system PATH

**Error: AWS credentials not found**
- Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are set in `.env`
- Check that the IAM user has the correct permissions

**Error: Access Denied (S3)**
- Verify the S3 bucket name is correct
- Check IAM policy permissions
- Ensure the bucket exists in the specified region

### Restoration

To restore from a backup:

```bash
# Download backup from S3
aws s3 cp s3://your-backup-bucket-name/Reposignal_backup_2026-01-12_14-30-45.sql ./backup.sql

# Restore to database
psql "your-database-url" < backup.sql
```
