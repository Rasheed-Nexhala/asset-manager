/**
 * backfill-is-low-stock.mjs
 *
 * One-time backfill: sets `isLowStock` on every item document in Firestore
 * based on the existing centralStoreQuantity and minStockLevel fields.
 *
 * Run ONCE before deploying the updated countLowStockItems function:
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json \
 *   node scripts/backfill-is-low-stock.mjs
 *
 * Or use a Firebase emulator for a dry run:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/backfill-is-low-stock.mjs
 *
 * The script is idempotent — safe to run multiple times.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const ITEMS_COLLECTION = 'items';
const BATCH_SIZE = 400; // Firestore batch limit is 500; keep margin

// --- Initialise Firebase Admin ---
if (getApps().length === 0) {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath) {
    console.error(
      'ERROR: Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path.\n' +
      'For emulator use, set FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 instead.'
    );
    process.exit(1);
  }
  const credential = JSON.parse((await import('fs')).readFileSync(credPath, 'utf8'));
  initializeApp({ credential: cert(credential) });
}

const db = getFirestore();

let totalProcessed = 0;
let totalUpdated = 0;
let totalSkipped = 0;
let lastDoc = null;

console.log('Starting isLowStock backfill...\n');

while (true) {
  let q = db.collection(ITEMS_COLLECTION).orderBy('__name__').limit(BATCH_SIZE);
  if (lastDoc) q = q.startAfter(lastDoc);

  const snapshot = await q.get();
  if (snapshot.empty) break;

  const batch = db.batch();
  let batchCount = 0;

  for (const docSnap of snapshot.docs) {
    totalProcessed++;
    const data = docSnap.data();
    const centralStoreQuantity = typeof data.centralStoreQuantity === 'number' ? data.centralStoreQuantity : 0;
    const minStockLevel = typeof data.minStockLevel === 'number' ? data.minStockLevel : 0;
    const isLowStock = centralStoreQuantity <= minStockLevel;

    // Skip if already correct to avoid unnecessary writes
    if (data.isLowStock === isLowStock) {
      totalSkipped++;
      continue;
    }

    batch.update(docSnap.ref, { isLowStock });
    batchCount++;
    totalUpdated++;
  }

  if (batchCount > 0) {
    await batch.commit();
    console.log(`  Batch committed: ${batchCount} updates (running total: ${totalUpdated} updated, ${totalSkipped} already correct)`);
  }

  lastDoc = snapshot.docs[snapshot.docs.length - 1];

  if (snapshot.docs.length < BATCH_SIZE) break; // last page
}

console.log('\n✅ Backfill complete.');
console.log(`   Total items processed : ${totalProcessed}`);
console.log(`   Updated (isLowStock written) : ${totalUpdated}`);
console.log(`   Skipped (already correct)    : ${totalSkipped}`);
