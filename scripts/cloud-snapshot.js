const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const JSZip = require('jszip');

const PROJECT_ID = 'trustcare-44705';
const STORAGE_BUCKET = 'trustcare-44705.firebasestorage.app';

// Ignored folders and files when packaging the application snapshot
const IGNORED = new Set([
  'node_modules',
  '.next',
  'backups',
  '.git',
  '.firebase',
  '.nyc_output',
  'coverage',
  '.DS_Store'
]);

function shouldIgnore(relativePath) {
  const parts = relativePath.split(path.sep);
  for (const p of parts) {
    if (IGNORED.has(p)) return true;
    if (p.endsWith('.log')) return true;
    if (p.endsWith('.tsbuildinfo')) return true;
  }
  return false;
}

function getGitMetadata() {
  const meta = {
    branch: 'unknown',
    commitHash: 'unknown',
    commitDate: 'unknown',
    commitMessage: 'unknown',
    status: '',
    hasUncommittedChanges: false,
    diff: ''
  };

  try {
    meta.branch = execSync('git rev-parse --abbrev-ref HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    meta.commitHash = execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    meta.commitDate = execSync('git log -1 --format=%cd --date=iso', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    meta.commitMessage = execSync('git log -1 --format=%s', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    meta.status = execSync('git status --short', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    meta.hasUncommittedChanges = meta.status.length > 0;
    meta.diff = execSync('git diff HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
  } catch (err) {
    // Git might not be available or clean
  }

  return meta;
}

function collectFiles(dir, rootDir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(rootDir, fullPath);

    if (shouldIgnore(relPath)) continue;

    if (entry.isDirectory()) {
      collectFiles(fullPath, rootDir, fileList);
    } else if (entry.isFile()) {
      fileList.push({ fullPath, relPath });
    }
  }
  return fileList;
}

async function createSnapshotZip(rootDir, outputPath, gitMeta, now) {
  const zip = new JSZip();
  const fileList = collectFiles(rootDir, rootDir);

  console.log(`Packaging ${fileList.length} application files into snapshot...`);

  for (const { fullPath, relPath } of fileList) {
    const content = fs.readFileSync(fullPath);
    zip.file(relPath, content);
  }

  // Add manifest
  const manifest = {
    snapshotName: 'TrustCare Portal Application Snapshot',
    createdAt: now.toISOString(),
    projectId: PROJECT_ID,
    storageBucket: STORAGE_BUCKET,
    git: {
      branch: gitMeta.branch,
      commitHash: gitMeta.commitHash,
      commitDate: gitMeta.commitDate,
      commitMessage: gitMeta.commitMessage,
      hasUncommittedChanges: gitMeta.hasUncommittedChanges,
      uncommittedStatusSummary: gitMeta.status
    },
    totalFiles: fileList.length
  };

  zip.file('snapshot_manifest.json', JSON.stringify(manifest, null, 2));

  if (gitMeta.diff) {
    zip.file('uncommitted_changes.diff', gitMeta.diff);
  }

  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });

  fs.writeFileSync(outputPath, buffer);
  const sizeMb = (buffer.length / 1024 / 1024).toFixed(2);
  console.log(`Application snapshot created: ${outputPath} (${sizeMb} MB)`);
  return { manifest, sizeMb };
}

function uploadToCloud(localPath, gcsPath) {
  console.log(`Uploading ${localPath} to gs://${STORAGE_BUCKET}/${gcsPath}...`);
  const crypto = require('crypto');
  const token = crypto.randomUUID();
  execSync(`gcloud storage cp "${localPath}" "gs://${STORAGE_BUCKET}/${gcsPath}"`, {
    stdio: 'inherit'
  });
  try {
    execSync(`gcloud storage objects update "gs://${STORAGE_BUCKET}/${gcsPath}" --custom-metadata=firebaseStorageDownloadTokens=${token}`, {
      stdio: 'ignore'
    });
    return `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodeURIComponent(gcsPath)}?alt=media&token=${token}`;
  } catch (err) {
    return `gs://${STORAGE_BUCKET}/${gcsPath}`;
  }
}

async function main() {
  console.log('====================================================');
  console.log('    TrustCare Application Snapshot & Cloud Upload   ');
  console.log('====================================================');

  const now = new Date();
  const timestampStr = now.toISOString().replace(/[:.]/g, '-');
  const projectRoot = path.resolve(__dirname, '..');
  const snapshotsDir = path.join(projectRoot, 'backups', 'application_snapshots');
  fs.mkdirSync(snapshotsDir, { recursive: true });

  const gitMeta = getGitMetadata();
  console.log(`Git Branch: ${gitMeta.branch} (${gitMeta.commitHash.substring(0, 8)})`);
  if (gitMeta.hasUncommittedChanges) {
    console.log('Note: Current workspace includes uncommitted modifications, which are captured in this snapshot.');
  }

  // 1. Create Application Snapshot ZIP
  const snapshotZipName = `TrustCare_App_Snapshot_${timestampStr}.zip`;
  const snapshotLocalPath = path.join(snapshotsDir, snapshotZipName);
  const latestLocalPath = path.join(snapshotsDir, 'TrustCare_App_Snapshot_LATEST.zip');

  const { manifest, sizeMb } = await createSnapshotZip(projectRoot, snapshotLocalPath, gitMeta, now);
  fs.copyFileSync(snapshotLocalPath, latestLocalPath);

  // 2. Upload Application Snapshot to Cloud Storage
  const gcsSnapshotPath = `backups/application_snapshots/${snapshotZipName}`;
  const gcsSnapshotLatest = `backups/application_snapshots/TrustCare_App_Snapshot_LATEST.zip`;
  const urlTimestamped = uploadToCloud(snapshotLocalPath, gcsSnapshotPath);
  const urlLatest = uploadToCloud(latestLocalPath, gcsSnapshotLatest);

  // 3. Check for Database Backup and upload to Cloud if exists
  const dbBackupLatest = path.join(projectRoot, 'backups', 'TrustCare_Full_Backup_LATEST.zip');
  let dbUrlLatest = '';
  if (fs.existsSync(dbBackupLatest)) {
    console.log('\nFound latest database backup. Uploading to Cloud Storage...');
    const gcsDbPath = `backups/database/TrustCare_Database_Backup_${timestampStr}.zip`;
    const gcsDbLatest = `backups/database/TrustCare_Database_Backup_LATEST.zip`;
    uploadToCloud(dbBackupLatest, gcsDbPath);
    dbUrlLatest = uploadToCloud(dbBackupLatest, gcsDbLatest);
  }

  console.log('====================================================');
  console.log('🎉 APPLICATION SNAPSHOT STORED ON CLOUD SUCCESSFULLY!');
  console.log(`📦 Local Archive:     ${snapshotLocalPath} (${sizeMb} MB)`);
  console.log(`☁️ Cloud Snapshot:     gs://${STORAGE_BUCKET}/${gcsSnapshotPath}`);
  console.log(`🌐 Direct Download:   ${urlLatest}`);
  if (dbUrlLatest) {
    console.log(`🌐 Database Download: ${dbUrlLatest}`);
  }
  console.log('====================================================');
}

main().catch((err) => {
  console.error('Fatal snapshot error:', err);
  process.exit(1);
});
