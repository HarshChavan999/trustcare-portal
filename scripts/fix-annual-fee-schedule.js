/**
 * fix-annual-fee-schedule.js
 *
 * DATA MIGRATION: Repair corrupted installmentSchedules for all students
 * where Annual Year Fee installments were incorrectly re-amortized.
 *
 * What this script does:
 *  1. Fetches all installmentSchedules documents
 *  2. Cross-references each with the student's admission data to get the correct startingYearFee
 *  3. Repairs any Annual Year Fee installment whose amount ≠ startingYearFee
 *  4. Fixes the schedule's totalFee to equal the full course fee (from admissions)
 *  5. Writes a DRY-RUN report first; pass --apply to actually patch Firestore
 *
 * Usage:
 *   node scripts/fix-annual-fee-schedule.js           # dry-run (safe, prints what would change)
 *   node scripts/fix-annual-fee-schedule.js --apply   # actually patches Firestore
 *
 * Requires: gcloud CLI logged in (same as backup-db.js)
 */

'use strict';

const { execSync } = require('child_process');

const PROJECT_ID = 'trustcare-44705';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const APPLY = process.argv.includes('--apply');

// ─── Firestore REST helpers ───────────────────────────────────────────────────

function getToken() {
  try {
    return execSync('gcloud auth print-access-token', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    throw new Error('gcloud not logged in. Run: gcloud auth login');
  }
}

function decodeValue(val) {
  if (!val) return null;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('booleanValue' in val) return val.booleanValue;
  if ('timestampValue' in val) return val.timestampValue;
  if ('nullValue' in val) return null;
  if ('mapValue' in val) {
    const res = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) res[k] = decodeValue(v);
    return res;
  }
  if ('arrayValue' in val) {
    return (val.arrayValue.values || []).map(decodeValue);
  }
  return val;
}

function decodeDoc(doc) {
  const fields = doc.fields || {};
  const data = {};
  for (const [k, v] of Object.entries(fields)) data[k] = decodeValue(v);
  return { id: doc.name.split('/').pop(), _name: doc.name, ...data };
}

async function fetchAll(collection, token) {
  const docs = [];
  let pageToken = '';
  do {
    const url = `${BASE_URL}/${collection}?pageSize=300${pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : ''}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`${res.status} fetching ${collection}: ${await res.text()}`);
    const json = await res.json();
    if (json.documents) docs.push(...json.documents.map(decodeDoc));
    pageToken = json.nextPageToken || '';
  } while (pageToken);
  return docs;
}

async function fetchDoc(collection, docId, token) {
  const url = `${BASE_URL}/${collection}/${encodeURIComponent(docId)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${res.status} fetching ${collection}/${docId}: ${await res.text()}`);
  return decodeDoc(await res.json());
}

// ─── Firestore value encoders ─────────────────────────────────────────────────

function encodeValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encodeValue) } };
  if (typeof v === 'object') {
    const fields = {};
    for (const [k, val] of Object.entries(v)) fields[k] = encodeValue(val);
    return { mapValue: { fields } };
  }
  return { stringValue: String(v) };
}

async function patchDoc(docName, fields, token) {
  // Build PATCH body — only patch specified fields
  const updateMask = Object.keys(fields).join(',');
  const encoded = {};
  for (const [k, v] of Object.entries(fields)) encoded[k] = encodeValue(v);
  const url = `https://firestore.googleapis.com/v1/${docName}?updateMask.fieldPaths=${encodeURIComponent(updateMask)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: encoded })
  });
  if (!res.ok) throw new Error(`PATCH failed ${docName}: ${res.status} ${await res.text()}`);
  return res.json();
}

// ─── Migration logic ──────────────────────────────────────────────────────────

function isAnnualFeeInstallment(inst) {
  return (inst.type || '').toLowerCase().includes('annual year fee');
}

async function run() {
  console.log(`\n🔍 Mode: ${APPLY ? '⚠️  APPLY (will write to Firestore)' : 'DRY RUN (read-only)'}`);
  console.log(`Project: ${PROJECT_ID}\n`);

  const token = getToken();

  // 1. Load all schedules and admissions
  console.log('📥 Fetching installmentSchedules...');
  const schedules = await fetchAll('installmentSchedules', token);
  console.log(`   ${schedules.length} schedule(s) found.`);

  console.log('📥 Fetching admissions...');
  const admissions = await fetchAll('admissions', token);
  console.log(`   ${admissions.length} admission(s) found.`);

  const admissionMap = new Map(admissions.map(a => [a.enrollmentId || a.id, a]));

  let totalChecked = 0;
  let totalFixed = 0;
  let totalErrors = 0;

  for (const schedule of schedules) {
    totalChecked++;
    const enrollmentId = schedule.enrollmentId || schedule.id;
    const installments = Array.isArray(schedule.installments) ? schedule.installments : [];

    // Skip if no annual fee installments exist in this schedule
    const annualRows = installments.filter(isAnnualFeeInstallment);
    if (annualRows.length === 0) continue;

    // Look up the student's admission to get correct startingYearFee + totalCourseFees
    const admission = admissionMap.get(enrollmentId);
    if (!admission) {
      console.warn(`  ⚠️  [${enrollmentId}] No admission found — skipping`);
      continue;
    }

    const correctAnnualFee = Number(admission.startingYearFee || 0);
    const correctTotalFee = Number(admission.totalCourseFees || 0);

    if (correctAnnualFee <= 0) {
      // No annual fee configured for this student — skip
      continue;
    }

    // Check if any annual fee row is wrong
    const corruptedAnnualRows = annualRows.filter(r => {
      const amt = Number(r.amount || 0);
      return Math.abs(amt - correctAnnualFee) > 1; // allow ₹1 rounding tolerance
    });

    // Check if totalFee stored in schedule is wrong
    const storedTotalFee = Number(schedule.totalFee || 0);
    const totalFeeWrong = correctTotalFee > 0 && Math.abs(storedTotalFee - correctTotalFee) > 1;

    if (corruptedAnnualRows.length === 0 && !totalFeeWrong) {
      // Nothing to fix
      continue;
    }

    // Build what the fixed installments array should look like
    const fixedInstallments = installments.map(inst => {
      if (!isAnnualFeeInstallment(inst)) return inst;
      const expected = correctAnnualFee;
      const actual = Number(inst.amount || 0);
      if (Math.abs(actual - expected) > 1) {
        return { ...inst, amount: expected };
      }
      return inst;
    });

    // Print report
    console.log(`\n🔧 [${enrollmentId}] ${admission.studentName || schedule.studentName}`);
    if (totalFeeWrong) {
      console.log(`   totalFee:    stored=₹${storedTotalFee.toLocaleString('en-IN')}  →  correct=₹${correctTotalFee.toLocaleString('en-IN')}`);
    }
    corruptedAnnualRows.forEach(r => {
      console.log(`   Installment ${r.installmentNumber} (${r.type}): ₹${Number(r.amount).toLocaleString('en-IN')} → ₹${correctAnnualFee.toLocaleString('en-IN')}`);
    });

    if (APPLY) {
      try {
        const patchFields = { installments: fixedInstallments };
        if (totalFeeWrong) patchFields.totalFee = correctTotalFee;

        await patchDoc(schedule._name, patchFields, token);
        console.log(`   ✅ Patched successfully.`);
        totalFixed++;
      } catch (err) {
        console.error(`   ❌ Failed to patch: ${err.message}`);
        totalErrors++;
      }
    } else {
      totalFixed++; // count as "would fix" in dry-run
    }
  }

  // ─── Summary ─────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(60));
  console.log(`📊 Summary`);
  console.log(`   Schedules checked : ${totalChecked}`);
  console.log(`   ${APPLY ? 'Fixed' : 'Would fix'}: ${totalFixed}`);
  if (APPLY) console.log(`   Errors           : ${totalErrors}`);
  if (!APPLY) {
    console.log('\n💡 To apply fixes, run:');
    console.log('   node scripts/fix-annual-fee-schedule.js --apply');
  }
  console.log('─'.repeat(60) + '\n');
}

run().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});

