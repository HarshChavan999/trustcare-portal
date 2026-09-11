const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const XLSX = require('xlsx');
const JSZip = require('jszip');

const PROJECT_ID = 'trustcare-44705';
const STORAGE_BUCKET = 'trustcare-44705.firebasestorage.app';

function getAccessToken() {
  try {
    const token = execSync('gcloud auth print-access-token', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    if (!token) throw new Error('Empty token returned from gcloud');
    return token;
  } catch (err) {
    throw new Error('Failed to get gcloud access token. Ensure gcloud is logged in.');
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
  if ('referenceValue' in val) return val.referenceValue;
  if ('geoPointValue' in val) return val.geoPointValue;
  if ('bytesValue' in val) return val.bytesValue;
  if ('mapValue' in val) {
    const res = {};
    const fields = val.mapValue.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      res[k] = decodeValue(v);
    }
    return res;
  }
  if ('arrayValue' in val) {
    const arr = val.arrayValue.values || [];
    return arr.map(decodeValue);
  }
  return val;
}

function decodeDoc(doc) {
  const fields = doc.fields || {};
  const data = {};
  for (const [k, v] of Object.entries(fields)) {
    data[k] = decodeValue(v);
  }
  const id = doc.name ? doc.name.split('/').pop() : '';
  return {
    id,
    ...data,
    _createTime: doc.createTime,
    _updateTime: doc.updateTime
  };
}

async function listCollections(token) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:listCollectionIds`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to list collections: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.collectionIds || [];
}

async function fetchCollectionDocs(collectionId, token) {
  const rawDocs = [];
  let pageToken = '';
  do {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collectionId}?pageSize=300${pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : ''}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch documents for ${collectionId}: ${res.status} ${text}`);
    }
    const data = await res.json();
    if (data.documents && data.documents.length > 0) {
      rawDocs.push(...data.documents);
    }
    pageToken = data.nextPageToken || '';
  } while (pageToken);

  return rawDocs;
}

function buildExcelWorkbook(cleanData) {
  const wb = XLSX.utils.book_new();

  const safeCell = (v) => {
    if (v === undefined || v === null) return '';
    if (typeof v === 'number' || typeof v === 'boolean') return v;
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    if (s.length > 32700) {
      return s.substring(0, 32700) + '... [TRUNCATED FOR EXCEL; FULL CONTENT IN JSON]';
    }
    return s;
  };

  const addSheet = (name, rows) => {
    const sanitized = rows.map((r) => {
      const row = {};
      for (const [k, v] of Object.entries(r)) {
        row[k] = safeCell(v);
      }
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(sanitized.length ? sanitized : [{}]);
    XLSX.utils.book_append_sheet(wb, ws, name.substring(0, 31));
  };

  // 1. INQUIRIES
  if (cleanData.inquiries) {
    const rows = cleanData.inquiries.map((inq) => ({
      'Inquiry ID': inq.id || '',
      'Date': inq.date || '',
      'Aadhaar Number': inq.aadharNumber || '',
      'First Name': inq.firstName || '',
      'Middle Name': inq.middleName || '',
      'Last Name': inq.lastName || '',
      'Full Name': inq.fullName || `${inq.firstName || ''} ${inq.lastName || ''}`.trim(),
      'Phone Number': inq.phoneNo || '',
      'WhatsApp Number': inq.whatsappNo || '',
      'Parents Phone': inq.parentsNo || '',
      'Email': inq.email || '',
      'Interested Course': inq.interestedCourse || '',
      'Qualification': inq.qualification || '',
      'Age': inq.age || '',
      'Gender': inq.gender || '',
      'Branch': inq.branch || '',
      'Full Address': inq.address || `${inq.addressLine1 || ''} ${inq.addressLine2 || ''} ${inq.pincode || ''}`.trim(),
      'Inquiry Taken By': inq.inquiryTakenBy || inq.loggedInUserId || '',
      'Status': inq.status || 'New Inquiry',
      'Admission Status': inq.admissionStatus || 'Not Admitted',
      'Admission Date': inq.admissionDate || '',
      'Created Timestamp': inq.timestamp || inq._createTime || ''
    }));
    addSheet('Inquiries', rows);
  }

  // 2. ADMISSIONS
  if (cleanData.admissions) {
    const rows = cleanData.admissions.map((adm) => ({
      'Enrollment ID': adm.enrollmentId || adm.id || '',
      'Receipt Number': adm.receiptNumber || '',
      'Admission Date': adm.date || '',
      'Student Name': adm.studentName || `${adm.firstName || ''} ${adm.lastName || ''}`.trim(),
      'First Name': adm.firstName || '',
      'Middle Name': adm.middleName || '',
      'Last Name': adm.lastName || '',
      'Email Address': adm.email || '',
      'Course Name': adm.courseName || '',
      'Course Duration': adm.courseDuration || '',
      'Total Course Fees': Number(adm.totalCourseFees || 0),
      'Admission Fee': Number(adm.admissionFee || 0),
      'Exam Fee': Number(adm.examFee || 0),
      'Starting Year Fee': Number(adm.startingYearFee || 0),
      'Payment Mode': adm.paymentMode || '',
      'Guardian Name': adm.guardianName || '',
      'Guardian Relation': adm.guardianRelation || '',
      'Terms Agreement': adm.agreement || 'Agreed',
      'Branch': adm.branch || '',
      'Created By': adm.user || '',
      'Student Photo URL': adm.photoUrl || '',
      'Created Timestamp': adm.timestamp || adm._createTime || ''
    }));
    addSheet('Admissions', rows);
  }

  // 3. ENROLLMENTS
  if (cleanData.enrollments) {
    const rows = cleanData.enrollments.map((enr) => ({
      'Enrollment ID': enr.enrollmentId || enr.id || '',
      'Student Name': enr.studentName || '',
      'Course': enr.course || '',
      'Date': enr.date || '',
      'Status': enr.status || 'Active',
      'Created Time': enr._createTime || ''
    }));
    addSheet('Enrollments', rows);
  }

  // 4. FEE STRUCTURES
  if (cleanData.feeStructures) {
    const rows = cleanData.feeStructures.map((fee) => ({
      'Enrollment ID': fee.enrollmentId || fee.id || '',
      'Student Name': fee.name || fee.studentName || '',
      'Course Name': fee.courseName || '',
      'Payment Mode': fee.paymentMode || '',
      'Admission Fee': Number(fee.admissionFee || 0),
      'Admission Fee Due': Number(fee.admissionFeeDue || 0),
      'Course Fee': Number(fee.courseFee || 0),
      'Course Fee Due': Number(fee.courseFeeDue || 0),
      'Exam Fee': Number(fee.examFee || 0),
      'Exam Fee Due': Number(fee.examFeeDue || 0),
      'Total Amount Due': Number(fee.totalAmountDue || 0),
      'Branch': fee.branch || '',
      'User / Officer': fee.userName || '',
      'Updated Timestamp': fee.timestamp || fee._updateTime || ''
    }));
    addSheet('Fee Structures', rows);

    // 5. DUE FEES (Filtered)
    const dueRows = cleanData.feeStructures
      .filter((f) => Number(f.totalAmountDue || 0) > 0)
      .map((fee) => ({
        'Enrollment ID': fee.enrollmentId || fee.id || '',
        'Student Name': fee.name || fee.studentName || '',
        'Course Name': fee.courseName || '',
        'Admission Fee Due': Number(fee.admissionFeeDue || 0),
        'Course Fee Due': Number(fee.courseFeeDue || 0),
        'Exam Fee Due': Number(fee.examFeeDue || 0),
        'Total Outstanding Due': Number(fee.totalAmountDue || 0),
        'Payment Mode': fee.paymentMode || '',
        'Branch': fee.branch || '',
        'User / Officer': fee.userName || '',
        'Last Updated': fee.timestamp || fee._updateTime || ''
      }));
    if (dueRows.length > 0) {
      addSheet('Due Fees', dueRows);
    }
  }

  // 6. INSTALLMENT PAYMENTS
  if (cleanData.installmentPayments) {
    const rows = [];
    cleanData.installmentPayments.forEach((hist) => {
      const payments = hist.payments || [];
      if (payments.length > 0) {
        payments.forEach((p) => {
          rows.push({
            'Enrollment ID': hist.enrollmentId || hist.id || '',
            'Student Name': hist.studentName || '',
            'Course Name': hist.courseName || '',
            'Installment Number': p.installmentNumber || '',
            'Amount Paid': Number(p.amountPaid || 0),
            'Payment Method': p.paymentMethod || '',
            'Payment Date': p.paymentDate || '',
            'Recorded By': p.user || hist.user || '',
            'Payment Timestamp': p.timestamp || hist.timestamp || hist._createTime || ''
          });
        });
      } else {
        rows.push({
          'Enrollment ID': hist.enrollmentId || hist.id || '',
          'Student Name': hist.studentName || '',
          'Course Name': hist.courseName || '',
          'Installment Number': 1,
          'Amount Paid': Number(hist.amountPaid || 0),
          'Payment Method': hist.paymentMethod || '',
          'Payment Date': '',
          'Recorded By': hist.user || '',
          'Payment Timestamp': hist.timestamp || hist._createTime || ''
        });
      }
    });
    addSheet('Installment Payments', rows);
  }

  // 7. INSTALLMENT SCHEDULES
  if (cleanData.installmentSchedules) {
    const rows = [];
    cleanData.installmentSchedules.forEach((sched) => {
      (sched.installments || []).forEach((inst) => {
        rows.push({
          'Enrollment ID': sched.enrollmentId || sched.id || '',
          'Student Name': sched.studentName || '',
          'Course Name': sched.courseName || '',
          'Payment Plan': sched.paymentType || 'emi',
          'Total Plan Fee': Number(sched.totalFee || 0),
          'Installment Number': inst.installmentNumber || '',
          'Scheduled Amount': Number(inst.amount || 0),
          'Due Date': inst.dueDate || '',
          'Status': inst.status || 'Pending',
          'Type': inst.type || ''
        });
      });
    });
    addSheet('Installment Schedules', rows);
  }

  // 8. EXAM RECEIPTS
  if (cleanData.examReceipts) {
    const rows = cleanData.examReceipts.map((er) => ({
      'Receipt ID': er.id || '',
      'Receipt Number': er.receiptNumber || '',
      'Receipt Date': er.receiptDate || '',
      'Enrollment ID': er.enrollmentId || '',
      'Student Name': er.studentName || '',
      'Course Name': er.courseName || '',
      'Total Amount': Number(er.totalAmount || 0),
      'Payment Mode': er.paymentMode || '',
      'Agreement': er.agreeTerms || 'Agreed',
      'Issued By': er.userId || '',
      'Timestamp': er.timestamp || er._createTime || ''
    }));
    addSheet('Exam Receipts', rows);
  }

  // 9. COURSES
  if (cleanData.courses) {
    const rows = cleanData.courses.map((c) => ({
      'Course ID': c.courseId || c.id || '',
      'Course Name': c.courseName || '',
      'Duration': c.duration || '',
      'Total Fees': Number(c.fees || 0),
      'Admission Fee': Number(c.admissionFee || 0),
      'Exam Fee': Number(c.examFee || 0),
      'Starting Year Fee': Number(c.startingYearFee || 0),
      'Active': c.active !== false ? 'TRUE' : 'FALSE',
      'Created By': c.createdBy || 'Admin'
    }));
    addSheet('Courses', rows);
  }

  // 10. USERS
  if (cleanData.users) {
    const rows = cleanData.users.map((u) => ({
      'User ID': u.id || '',
      'Username': u.username || u.name || '',
      'Email': u.email || '',
      'Role': u.role || '',
      'Branch': u.branch || '',
      'Status': u.status || 'active',
      'Created Time': u._createTime || ''
    }));
    addSheet('Users', rows);
  }

  // 11. AUDIT LOGS
  if (cleanData.auditLogs) {
    const rows = cleanData.auditLogs.map((log) => ({
      'Log ID': log.id || '',
      'Action': log.action || '',
      'User': log.user || log.userName || '',
      'Details': log.details || log.description || log.meta || '',
      'Branch': log.branch || '',
      'Timestamp': log.timestamp || log._createTime || ''
    }));
    addSheet('Audit Logs', rows);
  }

  // Any other collections not specifically mapped above
  const mapped = new Set([
    'inquiries', 'admissions', 'enrollments', 'feeStructures', 'installmentPayments',
    'installmentSchedules', 'examReceipts', 'courses', 'users', 'auditLogs'
  ]);

  for (const [colName, docs] of Object.entries(cleanData)) {
    if (!mapped.has(colName) && Array.isArray(docs) && docs.length > 0) {
      const sheetRows = docs.map((d) => {
        const flat = {};
        for (const [k, v] of Object.entries(d)) {
          flat[k] = v;
        }
        return flat;
      });
      addSheet(colName, sheetRows);
    }
  }

  return wb;
}

async function downloadStudentPhotos(destDir) {
  console.log('Downloading student photos from Firebase Storage...');
  try {
    fs.mkdirSync(destDir, { recursive: true });
    // Use gcloud storage cp to download all photos efficiently
    execSync(`gcloud storage cp "gs://${STORAGE_BUCKET}/student_photos/*" "${destDir}/"`, {
      stdio: 'inherit'
    });
    const files = fs.readdirSync(destDir);
    console.log(`Successfully downloaded ${files.length} student photos.`);
    return files.length;
  } catch (err) {
    console.warn('Could not batch copy photos using gcloud storage:', err.message);
    return 0;
  }
}

async function main() {
  console.log('====================================================');
  console.log('     TrustCare Full Database Backup Starting        ');
  console.log('====================================================');

  const now = new Date();
  const timestampStr = now.toISOString().replace(/[:.]/g, '-');
  const dateStr = now.toISOString().slice(0, 10);
  const backupDirName = `backup_${timestampStr}`;
  const backupRoot = path.resolve(__dirname, '..', 'backups', backupDirName);

  const rawDir = path.join(backupRoot, 'raw_firestore');
  const collectionsDir = path.join(backupRoot, 'collections');
  const photosDir = path.join(backupRoot, 'student_photos');

  fs.mkdirSync(rawDir, { recursive: true });
  fs.mkdirSync(collectionsDir, { recursive: true });
  fs.mkdirSync(photosDir, { recursive: true });

  console.log(`Output Directory: ${backupRoot}`);
  console.log('Authenticating with Google Cloud...');
  const token = getAccessToken();

  console.log('Discovering all Firestore collections...');
  const collectionIds = await listCollections(token);
  console.log(`Found ${collectionIds.length} collections:`, collectionIds.join(', '));

  const allRawData = {};
  const allCleanData = {};
  const stats = {};

  for (const colId of collectionIds) {
    process.stdout.write(`Fetching collection: ${colId}... `);
    const rawDocs = await fetchCollectionDocs(colId, token);
    const cleanDocs = rawDocs.map(decodeDoc);

    allRawData[colId] = rawDocs;
    allCleanData[colId] = cleanDocs;
    stats[colId] = cleanDocs.length;

    // Save individual collection files
    fs.writeFileSync(path.join(rawDir, `${colId}.json`), JSON.stringify(rawDocs, null, 2));
    fs.writeFileSync(path.join(collectionsDir, `${colId}.json`), JSON.stringify(cleanDocs, null, 2));
    console.log(`${cleanDocs.length} documents.`);
  }

  // Save full combined database JSONs
  console.log('Saving all_collections.json and raw_database.json...');
  fs.writeFileSync(path.join(backupRoot, 'all_collections.json'), JSON.stringify(allCleanData, null, 2));
  fs.writeFileSync(path.join(backupRoot, 'raw_database.json'), JSON.stringify(allRawData, null, 2));

  // Build Excel Workbook
  console.log('Generating multi-sheet Excel Workbook (.xlsx)...');
  const wb = buildExcelWorkbook(allCleanData);
  const excelPath = path.join(backupRoot, `TrustCare_Database_Backup_${dateStr}.xlsx`);
  XLSX.writeFile(wb, excelPath);
  console.log(`Excel backup saved to ${excelPath}`);

  // Download photos
  const photoCount = await downloadStudentPhotos(photosDir);

  // Manifest metadata
  const totalDocs = Object.values(stats).reduce((a, b) => a + b, 0);
  const manifest = {
    backupDate: now.toISOString(),
    projectId: PROJECT_ID,
    storageBucket: STORAGE_BUCKET,
    totalCollections: collectionIds.length,
    totalDocuments: totalDocs,
    totalPhotos: photoCount,
    collections: stats
  };
  fs.writeFileSync(path.join(backupRoot, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // Create Zip Archive
  console.log('Compressing backup into ZIP archive...');
  const zip = new JSZip();

  function addFolderToZip(folderPath, zipFolder) {
    const items = fs.readdirSync(folderPath);
    for (const item of items) {
      const itemPath = path.join(folderPath, item);
      const stat = fs.statSync(itemPath);
      if (stat.isDirectory()) {
        const subZip = zipFolder.folder(item);
        addFolderToZip(itemPath, subZip);
      } else {
        const content = fs.readFileSync(itemPath);
        zipFolder.file(item, content);
      }
    }
  }

  addFolderToZip(backupRoot, zip);
  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  const zipPath = path.resolve(__dirname, '..', 'backups', `TrustCare_Full_Backup_${timestampStr}.zip`);
  fs.writeFileSync(zipPath, zipBuffer);

  // Also create a convenient "latest" pointer or copy of zip
  const latestZipPath = path.resolve(__dirname, '..', 'backups', `TrustCare_Full_Backup_LATEST.zip`);
  fs.copyFileSync(zipPath, latestZipPath);

  console.log('====================================================');
  console.log('🎉 BACKUP COMPLETED SUCCESSFULLY!');
  console.log(`📁 Backup Folder: ${backupRoot}`);
  console.log(`📦 Backup Archive (.zip): ${zipPath}`);
  console.log(`📊 Total Documents: ${totalDocs}`);
  console.log(`📸 Total Photos: ${photoCount}`);
  console.log('====================================================');
}

main().catch((err) => {
  console.error('Fatal backup error:', err);
  process.exit(1);
});
