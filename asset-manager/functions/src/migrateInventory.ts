/**
 * One-time migration: fix inventory document IDs
 *
 * Problem: inventory documents added manually in the Firebase console (or via legacy
 * code) may have auto-generated IDs instead of the required `${itemId}_${locationId}`
 * format. The transfer flow looks up inventory by this exact document ID, so documents
 * with wrong IDs cause "Item X not found at Site Y" errors.
 *
 * What this script does:
 *  1. Reads every document in the `inventory` collection.
 *  2. Computes the expected ID: `${data.itemId}_${data.locationId}`.
 *  3. If the current doc ID doesn't match, it:
 *       a. Creates a new document with the correct ID (same data).
 *       b. Deletes the old document.
 *  4. Documents that already have the correct ID are left untouched.
 *
 * Usage:
 *   DRY RUN  (safe, no writes):    npx ts-node src/migrateInventory.ts
 *   EXECUTE  (makes real changes):  DRY_RUN=false npx ts-node src/migrateInventory.ts
 *
 * Authentication:
 *   The script uses Application Default Credentials. Before running, ensure you
 *   are authenticated:
 *     firebase login
 *     gcloud auth application-default login   ← run this if you see credential errors
 */

import * as admin from 'firebase-admin';

const PROJECT_ID =
  process.env.FIREBASE_MIGRATION_PROJECT_ID ?? 'asset-management-system-622c2';

// Safety: default to dry run. Set DRY_RUN=false in env to actually write.
const DRY_RUN = process.env.DRY_RUN !== 'false';

admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();

interface MigrationTarget {
  oldId: string;
  newId: string;
  data: admin.firestore.DocumentData;
}

async function migrateInventoryDocs(): Promise<void> {
  console.log('=========================================');
  console.log('  CIAMS Inventory Document ID Migration  ');
  console.log('=========================================');
  console.log(`Mode    : ${DRY_RUN ? '🔍 DRY RUN (no changes will be made)' : '🚀 EXECUTE (real writes)'}`);
  console.log(`Project : ${PROJECT_ID}`);
  console.log('');

  console.log('Fetching all inventory documents...');
  const snapshot = await db.collection('inventory').get();
  console.log(`Found ${snapshot.size} documents.\n`);

  const toMigrate: MigrationTarget[] = [];
  const alreadyCorrect: string[] = [];
  const skippedMissingFields: string[] = [];

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const itemId = data.itemId as string | undefined;
    const locationId = data.locationId as string | undefined;

    if (!itemId || !locationId) {
      skippedMissingFields.push(docSnap.id);
      continue;
    }

    const expectedId = `${itemId}_${locationId}`;

    if (docSnap.id === expectedId) {
      alreadyCorrect.push(docSnap.id);
    } else {
      toMigrate.push({ oldId: docSnap.id, newId: expectedId, data });
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('── Scan results ──────────────────────────────────');
  console.log(`  ✅ Already correct format : ${alreadyCorrect.length}`);
  console.log(`  🔧 Need migration         : ${toMigrate.length}`);
  console.log(`  ⚠️  Missing itemId/locationId: ${skippedMissingFields.length}`);
  console.log('');

  if (skippedMissingFields.length > 0) {
    console.log('⚠️  Skipped (missing itemId or locationId field):');
    skippedMissingFields.forEach((id) => console.log(`    - ${id}`));
    console.log('');
  }

  if (toMigrate.length === 0) {
    console.log('✅ Nothing to migrate — all documents already have correct IDs.');
    return;
  }

  console.log('🔧 Documents that will be migrated:');
  toMigrate.forEach(({ oldId, newId, data }) => {
    const item = (data.itemName as string | undefined) ?? data.itemId;
    const loc = data.locationId;
    console.log(`    ${oldId}`);
    console.log(`      → ${newId}  (${item} @ ${loc})`);
  });
  console.log('');

  if (DRY_RUN) {
    console.log('──────────────────────────────────────────────────');
    console.log('DRY RUN complete. No changes were made.');
    console.log('To execute, run:  DRY_RUN=false npx ts-node src/migrateInventory.ts');
    return;
  }

  // ── Execute ───────────────────────────────────────────────────────────────
  console.log('── Executing migration ───────────────────────────');
  let succeeded = 0;
  let failed = 0;
  let skippedConflict = 0;

  for (const { oldId, newId, data } of toMigrate) {
    try {
      const newRef = db.collection('inventory').doc(newId);
      const oldRef = db.collection('inventory').doc(oldId);

      // Guard: if a correctly-named doc already exists, merging blindly could
      // overwrite real data. Skip and let the user decide.
      const existing = await newRef.get();
      if (existing.exists) {
        console.log(`  ⚠️  SKIPPED ${oldId}`);
        console.log(`       Target ${newId} already exists — manual review needed.`);
        skippedConflict++;
        continue;
      }

      // Atomic: create correct doc + delete wrong doc in one batch.
      const batch = db.batch();
      batch.set(newRef, data);
      batch.delete(oldRef);
      await batch.commit();

      console.log(`  ✅ ${oldId}`);
      console.log(`       → ${newId}`);
      succeeded++;
    } catch (error) {
      console.error(`  ❌ FAILED ${oldId}:`, error);
      failed++;
    }
  }

  // ── Final report ─────────────────────────────────────────────────────────
  console.log('');
  console.log('── Migration complete ────────────────────────────');
  console.log(`  ✅ Migrated         : ${succeeded}`);
  if (skippedConflict > 0) {
    console.log(`  ⚠️  Skipped (conflict): ${skippedConflict}  ← review manually`);
  }
  if (failed > 0) {
    console.log(`  ❌ Failed           : ${failed}  ← check errors above`);
  }
  if (skippedConflict === 0 && failed === 0) {
    console.log('  All documents successfully migrated.');
  }
}

migrateInventoryDocs().catch((err) => {
  console.error('\n❌ Migration aborted:', err);
  process.exit(1);
});
