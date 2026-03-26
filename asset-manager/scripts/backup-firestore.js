/**
 * Firestore Backup Script
 *
 * Exports all Firestore collections to a timestamped JSON file.
 * Run manually or schedule via cron.
 *
 * Usage:
 *   node scripts/backup-firestore.js
 *   node scripts/backup-firestore.js --output ./my-backup.json
 *
 * Requirements:
 *   - Service account key: scripts/serviceAccountKey.json
 *     Download from: Firebase Console → Project Settings → Service Accounts → Generate new private key
 *   - Install deps (one time): npm install firebase-admin --save-dev
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey.json');
const OUTPUT_DIR = path.join(__dirname, '../backups');

// All top-level collections to back up
const TOP_LEVEL_COLLECTIONS = [
  'users',
  'sites',
  'items',
  'inventory',
  'categories',
  'steelMaster',
  'maintenance',
  'inventoryAdjustments',
  'purchaseOrders',
  'vendors',
  'poCounters',
  'grrCounters',
  'requests',
  'requestCounters',
  'activityLogs',
];

// Subcollections: { parentCollection: [subcollectionName, ...] }
const SUBCOLLECTIONS = {
  notifications: ['items'],
};

// ─── Init ─────────────────────────────────────────────────────────────────────

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error(`\nERROR: Service account key not found at:\n  ${SERVICE_ACCOUNT_PATH}`);
  console.error('\nDownload it from:');
  console.error('  Firebase Console → Project Settings → Service Accounts → Generate new private key');
  console.error('Then save it as: scripts/serviceAccountKey.json\n');
  process.exit(1);
}

const serviceAccount = require(SERVICE_ACCOUNT_PATH);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Converts Firestore Timestamps to ISO strings for JSON serialization.
 * Handles nested objects and arrays recursively.
 */
function serializeDoc(data) {
  if (data === null || data === undefined) return data;

  if (data instanceof admin.firestore.Timestamp) {
    return { _type: 'Timestamp', value: data.toDate().toISOString() };
  }

  if (Array.isArray(data)) {
    return data.map(serializeDoc);
  }

  if (typeof data === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = serializeDoc(value);
    }
    return result;
  }

  return data;
}

/**
 * Exports all documents from a collection.
 * Returns an object keyed by document ID.
 */
async function exportCollection(collectionPath) {
  const snapshot = await db.collection(collectionPath).get();
  const docs = {};
  for (const doc of snapshot.docs) {
    docs[doc.id] = serializeDoc(doc.data());
  }
  return docs;
}

/**
 * Exports a subcollection for every document in a parent collection.
 * Returns { parentDocId: { subcollectionName: { docId: data } } }
 */
async function exportSubcollection(parentCollection, subcollectionName) {
  const parentSnapshot = await db.collection(parentCollection).get();
  const result = {};

  for (const parentDoc of parentSnapshot.docs) {
    const subSnapshot = await db
      .collection(parentCollection)
      .doc(parentDoc.id)
      .collection(subcollectionName)
      .get();

    if (!subSnapshot.empty) {
      if (!result[parentDoc.id]) result[parentDoc.id] = {};
      result[parentDoc.id][subcollectionName] = {};
      for (const subDoc of subSnapshot.docs) {
        result[parentDoc.id][subcollectionName][subDoc.id] = serializeDoc(subDoc.data());
      }
    }
  }

  return result;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function runBackup() {
  const args = process.argv.slice(2);
  const outputFlag = args.indexOf('--output');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  let outputPath;
  if (outputFlag !== -1 && args[outputFlag + 1]) {
    outputPath = path.resolve(args[outputFlag + 1]);
  } else {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    outputPath = path.join(OUTPUT_DIR, `firestore-backup-${timestamp}.json`);
  }

  console.log(`\nFirestore Backup — ${new Date().toLocaleString()}`);
  console.log(`Project: ${serviceAccount.project_id}`);
  console.log(`Output:  ${outputPath}\n`);

  const backup = {
    _meta: {
      projectId: serviceAccount.project_id,
      exportedAt: new Date().toISOString(),
      collections: TOP_LEVEL_COLLECTIONS,
      subcollections: SUBCOLLECTIONS,
    },
    collections: {},
    subcollections: {},
  };

  // Export top-level collections
  for (const collectionName of TOP_LEVEL_COLLECTIONS) {
    process.stdout.write(`  Exporting ${collectionName}...`);
    try {
      backup.collections[collectionName] = await exportCollection(collectionName);
      const count = Object.keys(backup.collections[collectionName]).length;
      console.log(` ${count} docs`);
    } catch (err) {
      console.log(` ERROR: ${err.message}`);
    }
  }

  // Export subcollections
  for (const [parentCollection, subNames] of Object.entries(SUBCOLLECTIONS)) {
    for (const subName of subNames) {
      const label = `${parentCollection}/{id}/${subName}`;
      process.stdout.write(`  Exporting ${label}...`);
      try {
        const subData = await exportSubcollection(parentCollection, subName);
        const parentCount = Object.keys(subData).length;
        if (parentCount > 0) {
          if (!backup.subcollections[parentCollection]) {
            backup.subcollections[parentCollection] = {};
          }
          backup.subcollections[parentCollection][subName] = subData;
          console.log(` ${parentCount} parents with subcollection docs`);
        } else {
          console.log(` (empty)`);
        }
      } catch (err) {
        console.log(` ERROR: ${err.message}`);
      }
    }
  }

  // Write JSON
  fs.writeFileSync(outputPath, JSON.stringify(backup, null, 2), 'utf8');

  const fileSizeKB = (fs.statSync(outputPath).size / 1024).toFixed(1);
  console.log(`\nBackup complete. File size: ${fileSizeKB} KB`);
  console.log(`Saved to: ${outputPath}\n`);

  process.exit(0);
}

runBackup().catch((err) => {
  console.error('\nBackup failed:', err);
  process.exit(1);
});
