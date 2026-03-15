/**
 * CIAMS - Scheduled Backup (Firestore, Auth, Storage)
 *
 * Runs daily via Cloud Scheduler. Exports:
 * - Firestore: all collections to GCS
 * - Auth: all users to JSON (compatible with firebase auth:import)
 * - Storage: all files from default bucket to backup bucket
 *
 * Prerequisites:
 * - Backup bucket: gs://PROJECT_ID-backups-us (must be in US region for Firestore export)
 * - IAM: Cloud Function service account needs datastore.importExportAdmin + Storage Admin on bucket
 * - IAM: Firestore service account needs storage.admin on project (for Firestore export writes)
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import * as firestoreAdmin from '@google-cloud/firestore';
import * as logger from 'firebase-functions/logger';

const firestoreClient = new firestoreAdmin.v1.FirestoreAdminClient();

/** Auth export format compatible with firebase auth:import */
interface AuthExportUser {
  localId: string;
  email?: string;
  emailVerified?: boolean;
  displayName?: string;
  photoUrl?: string;
  phoneNumber?: string;
  createdAt?: string;
  lastSignedInAt?: string;
  providerUserInfo?: Array<{
    providerId: string;
    rawId: string;
    email?: string;
    displayName?: string;
    photoUrl?: string;
  }>;
}

/**
 * Scheduled backup — runs daily at 2 AM Asia/Kolkata.
 * Backs up Firestore, Auth, and Storage to gs://PROJECT_ID-backups-us/
 * (US bucket required: Firestore export only supports us/us-central1/etc.)
 */
export const scheduledFirestoreBackup = onSchedule(
  {
    schedule: '0 2 * * *', // 2 AM daily (cron: min hour day month weekday)
    timeZone: 'Asia/Kolkata',
    region: 'europe-west1', // Close to Firestore eur3
    timeoutSeconds: 540, // 9 min — Storage backup can be slow for many files
  },
  async () => {
    const projectId = process.env.GCLOUD_PROJECT ?? process.env.GCP_PROJECT;
    if (!projectId) {
      logger.error('scheduledFirestoreBackup: GCLOUD_PROJECT not set');
      throw new Error('Project ID not available');
    }

    const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const backupBucketName = `${projectId}-backups-us`;

    // Ensure admin is initialized (idempotent)
    if (!admin.apps.length) {
      admin.initializeApp();
    }

    // 1. Firestore export (async — Firestore service writes to GCS)
    const firestorePrefix = `gs://${backupBucketName}/firestore/${dateStr}`;
    const databaseName = firestoreClient.databasePath(projectId, '(default)');

    try {
      const [operation] = await firestoreClient.exportDocuments({
        name: databaseName,
        outputUriPrefix: firestorePrefix,
        collectionIds: [],
      });
      logger.info('scheduledFirestoreBackup: Firestore export started', {
        operationName: operation.name,
        outputUriPrefix: firestorePrefix,
      });
    } catch (err) {
      logger.error('scheduledFirestoreBackup: Firestore export failed', { err, firestorePrefix });
      throw err;
    }

    // 2. Auth export — list all users, write JSON to GCS
    const auth = admin.auth();
    const users: AuthExportUser[] = [];
    let pageToken: string | undefined;

    do {
      const listResult = await auth.listUsers(1000, pageToken);
      for (const user of listResult.users) {
        users.push({
          localId: user.uid,
          email: user.email ?? undefined,
          emailVerified: user.emailVerified ?? undefined,
          displayName: user.displayName ?? undefined,
          photoUrl: user.photoURL ?? undefined,
          phoneNumber: user.phoneNumber ?? undefined,
          createdAt: user.metadata.creationTime
            ? String(new Date(user.metadata.creationTime).getTime())
            : undefined,
          lastSignedInAt: user.metadata.lastSignInTime
            ? String(new Date(user.metadata.lastSignInTime).getTime())
            : undefined,
          providerUserInfo:
            user.providerData?.length > 0
              ? user.providerData.map((p) => ({
                  providerId: p.providerId,
                  rawId: p.uid,
                  email: p.email ?? undefined,
                  displayName: p.displayName ?? undefined,
                  photoUrl: p.photoURL ?? undefined,
                }))
              : undefined,
        });
      }
      pageToken = listResult.pageToken;
    } while (pageToken);

    const backupBucket = admin.storage().bucket(backupBucketName);
    const authFile = backupBucket.file(`auth/${dateStr}.json`);
    await authFile.save(JSON.stringify({ users }, null, 2), {
      contentType: 'application/json',
    });
    logger.info('scheduledFirestoreBackup: Auth export completed', {
      userCount: users.length,
      path: `auth/${dateStr}.json`,
    });

    // 3. Storage backup — copy files from default bucket to backup bucket
    try {
      const defaultBucket = admin.storage().bucket(`${projectId}.appspot.com`);
      const storagePrefix = `storage/${dateStr}`;
      let fileCount = 0;

      const [files] = await defaultBucket.getFiles();
      for (const file of files) {
        const destPath = `${storagePrefix}/${file.name}`;
        await file.copy(backupBucket.file(destPath));
        fileCount++;
      }

      logger.info('scheduledFirestoreBackup: Storage backup completed', {
        fileCount,
        path: storagePrefix,
      });
    } catch (storageErr) {
      // Don't fail entire backup if Storage fails (e.g. bucket doesn't exist yet)
      logger.warn('scheduledFirestoreBackup: Storage backup failed (non-fatal)', {
        err: storageErr,
      });
    }

    logger.info('scheduledFirestoreBackup: All backups completed', {
      firestore: firestorePrefix,
      auth: `auth/${dateStr}.json`,
      storage: `storage/${dateStr}`,
    });
  }
);
