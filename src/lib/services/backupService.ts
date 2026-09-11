import * as XLSX from "xlsx";
import JSZip from "jszip";
import { db, storage } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  Timestamp
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, getBlob } from "firebase/storage";

export interface BackupDataSummary {
  inquiriesCount: number;
  admissionsCount: number;
  feeStructuresCount: number;
  dueFeesCount: number;
  installmentSchedulesCount: number;
  installmentPaymentsCount: number;
  examReceiptsCount: number;
  coursesCount: number;
  photosCount: number;
}

export interface ParsedImportData {
  summary: BackupDataSummary;
  inquiries: any[];
  admissions: any[];
  feeStructures: any[];
  installmentSchedules: any[];
  installmentPayments: any[];
  examReceipts: any[];
  courses: any[];
  photos: { [enrollmentId: string]: Blob | File | string };
}

// Fetch all collections data from Firestore
export async function fetchAllPortalData() {
  const [
    inquiriesSnap,
    admissionsSnap,
    feeStructuresSnap,
    installmentSchedulesSnap,
    installmentPaymentsSnap,
    examReceiptsSnap,
    coursesSnap
  ] = await Promise.all([
    getDocs(collection(db, "inquiries")),
    getDocs(collection(db, "admissions")),
    getDocs(collection(db, "feeStructures")),
    getDocs(collection(db, "installmentSchedules")),
    getDocs(collection(db, "installmentPayments")),
    getDocs(collection(db, "examReceipts")),
    getDocs(collection(db, "courses"))
  ]);

  const inquiries: any[] = [];
  inquiriesSnap.forEach((d) => inquiries.push({ ...d.data(), id: d.id }));

  const admissions: any[] = [];
  admissionsSnap.forEach((d) => admissions.push({ ...d.data(), id: d.id }));

  const feeStructures: any[] = [];
  feeStructuresSnap.forEach((d) => feeStructures.push({ ...d.data(), id: d.id }));

  const installmentSchedules: any[] = [];
  installmentSchedulesSnap.forEach((d) => installmentSchedules.push({ ...d.data(), id: d.id }));

  const installmentPayments: any[] = [];
  installmentPaymentsSnap.forEach((d) => installmentPayments.push({ ...d.data(), id: d.id }));

  const examReceipts: any[] = [];
  examReceiptsSnap.forEach((d) => examReceipts.push({ ...d.data(), id: d.id }));

  const courses: any[] = [];
  coursesSnap.forEach((d) => courses.push({ ...d.data(), id: d.id }));

  return {
    inquiries,
    admissions,
    feeStructures,
    installmentSchedules,
    installmentPayments,
    examReceipts,
    courses
  };
}

// Format timestamp helper
function formatTimestamp(ts: any): string {
  if (!ts) return "";
  if (typeof ts === "string") return ts;
  if (ts.toDate && typeof ts.toDate === "function") {
    return ts.toDate().toISOString();
  }
  if (ts.seconds) {
    return new Date(ts.seconds * 1000).toISOString();
  }
  return String(ts);
}

// Convert data to multi-sheet Google Sheets / Excel Workbook (.xlsx)
export function createGoogleSheetsWorkbook(data: {
  inquiries: any[];
  admissions: any[];
  feeStructures: any[];
  installmentSchedules?: any[];
  installmentPayments?: any[];
  examReceipts?: any[];
  courses?: any[];
}): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // 1. INQUIRY SHEET
  const inquiryRows = (data.inquiries || []).map((inq) => ({
    "Inquiry ID": inq.id || "",
    "Date": inq.date || "",
    "Aadhaar Number": inq.aadharNumber || "",
    "First Name": inq.firstName || "",
    "Middle Name": inq.middleName || "",
    "Last Name": inq.lastName || "",
    "Full Name": inq.fullName || `${inq.firstName || ""} ${inq.middleName || ""} ${inq.lastName || ""}`.trim(),
    "Phone Number": inq.phoneNo || "",
    "WhatsApp Number": inq.whatsappNo || "",
    "Parents Phone": inq.parentsNo || "",
    "Email": inq.email || "",
    "Interested Course": inq.interestedCourse || "",
    "Qualification": inq.qualification || "",
    "Age": inq.age || "",
    "Gender": inq.gender || "",
    "Branch": inq.branch || "",
    "Address Line 1": inq.addressLine1 || "",
    "Address Line 2": inq.addressLine2 || "",
    "Address Line 3": inq.addressLine3 || "",
    "Pincode": inq.pincode || "",
    "Full Address": inq.address || "",
    "Inquiry Taken By": inq.inquiryTakenBy || inq.loggedInUserId || "",
    "Status": inq.status || "New Inquiry",
    "Admission Status": inq.admissionStatus || "Not Admitted",
    "Admission Date": inq.admissionDate || "",
    "Created Timestamp": formatTimestamp(inq.timestamp)
  }));
  const wsInquiry = XLSX.utils.json_to_sheet(inquiryRows.length ? inquiryRows : [{ "Inquiry ID": "", "Full Name": "" }]);
  XLSX.utils.book_append_sheet(wb, wsInquiry, "Inquiry");

  // 2. ADMISSION SHEET (Includes Student Photo URL and Google Sheets =IMAGE() Formula)
  const admissionRows = (data.admissions || []).map((adm) => {
    const photoUrl = adm.photoUrl || "";
    // Google Sheets formula to render photo right inside the cell
    const photoFormula = photoUrl ? `=IMAGE("${photoUrl}")` : "";
    return {
      "Enrollment ID": adm.enrollmentId || adm.id || "",
      "Receipt Number": adm.receiptNumber || "",
      "Admission Date": adm.date || "",
      "Student Name": adm.studentName || `${adm.firstName || ""} ${adm.middleName || ""} ${adm.lastName || ""}`.trim(),
      "First Name": adm.firstName || "",
      "Middle Name": adm.middleName || "",
      "Last Name": adm.lastName || "",
      "Email Address": adm.email || "",
      "Course Name": adm.courseName || "",
      "Course Duration": adm.courseDuration || "",
      "Total Course Fees": Number(adm.totalCourseFees || 0),
      "Admission Fee": Number(adm.admissionFee || 0),
      "Exam Fee": Number(adm.examFee || 0),
      "Starting Year Fee": Number(adm.startingYearFee || 0),
      "Payment Mode": adm.paymentMode || "",
      "Guardian Name": adm.guardianName || "",
      "Guardian Relation": adm.guardianRelation || "",
      "Terms Agreement": adm.agreement || "Agreed",
      "Branch": adm.branch || "",
      "Created By": adm.user || "",
      "Student Photo Preview": photoFormula,
      "Student Photo URL": photoUrl,
      "Created Timestamp": formatTimestamp(adm.timestamp)
    };
  });
  const wsAdmission = XLSX.utils.json_to_sheet(admissionRows.length ? admissionRows : [{ "Enrollment ID": "", "Student Name": "" }]);
  XLSX.utils.book_append_sheet(wb, wsAdmission, "Admission");

  // 3. FEES (FEE STRUCTURE) SHEET
  const feeRows = (data.feeStructures || []).map((fee) => ({
    "Enrollment ID": fee.enrollmentId || fee.id || "",
    "Student Name": fee.name || fee.studentName || "",
    "Course Name": fee.courseName || "",
    "Payment Mode": fee.paymentMode || "",
    "Admission Fee": Number(fee.admissionFee || 0),
    "Admission Fee Due": Number(fee.admissionFeeDue || 0),
    "Course Fee": Number(fee.courseFee || 0),
    "Course Fee Due": Number(fee.courseFeeDue || 0),
    "Exam Fee": Number(fee.examFee || 0),
    "Exam Fee Due": Number(fee.examFeeDue || 0),
    "Total Amount Due": Number(fee.totalAmountDue || 0),
    "Branch": fee.branch || "",
    "User / Officer": fee.userName || "",
    "Updated Timestamp": formatTimestamp(fee.timestamp)
  }));
  const wsFees = XLSX.utils.json_to_sheet(feeRows.length ? feeRows : [{ "Enrollment ID": "", "Student Name": "" }]);
  XLSX.utils.book_append_sheet(wb, wsFees, "Fees");

  // 4. DUE FEES SHEET (Filtered list of accounts with pending balances)
  const dueFeeRows = (data.feeStructures || [])
    .filter((fee) => Number(fee.totalAmountDue || 0) > 0)
    .map((fee) => ({
      "Enrollment ID": fee.enrollmentId || fee.id || "",
      "Student Name": fee.name || fee.studentName || "",
      "Course Name": fee.courseName || "",
      "Admission Fee Due": Number(fee.admissionFeeDue || 0),
      "Course Fee Due": Number(fee.courseFeeDue || 0),
      "Exam Fee Due": Number(fee.examFeeDue || 0),
      "Total Outstanding Due": Number(fee.totalAmountDue || 0),
      "Payment Mode": fee.paymentMode || "",
      "Branch": fee.branch || "",
      "User / Officer": fee.userName || "",
      "Last Updated": formatTimestamp(fee.timestamp)
    }));
  const wsDueFees = XLSX.utils.json_to_sheet(dueFeeRows.length ? dueFeeRows : [{ "Enrollment ID": "", "Total Outstanding Due": 0 }]);
  XLSX.utils.book_append_sheet(wb, wsDueFees, "Due Fees");

  // 5. INSTALLMENT PAYMENTS SHEET
  const installmentPaymentRows: any[] = [];
  (data.installmentPayments || []).forEach((hist) => {
    const payments = hist.payments || [];
    if (payments.length > 0) {
      payments.forEach((p: any) => {
        installmentPaymentRows.push({
          "Enrollment ID": hist.enrollmentId || hist.id || "",
          "Student Name": hist.studentName || "",
          "Course Name": hist.courseName || "",
          "Installment Number": p.installmentNumber || "",
          "Amount Paid": Number(p.amountPaid || 0),
          "Payment Method": p.paymentMethod || "",
          "Payment Date": p.paymentDate || "",
          "Recorded By User": p.user || hist.user || "",
          "Payment Timestamp": formatTimestamp(p.timestamp || hist.timestamp)
        });
      });
    } else {
      installmentPaymentRows.push({
        "Enrollment ID": hist.enrollmentId || hist.id || "",
        "Student Name": hist.studentName || "",
        "Course Name": hist.courseName || "",
        "Installment Number": 1,
        "Amount Paid": Number(hist.amountPaid || 0),
        "Payment Method": hist.paymentMethod || "",
        "Payment Date": "",
        "Recorded By User": hist.user || "",
        "Payment Timestamp": formatTimestamp(hist.timestamp)
      });
    }
  });
  const wsInstPayments = XLSX.utils.json_to_sheet(installmentPaymentRows.length ? installmentPaymentRows : [{ "Enrollment ID": "", "Amount Paid": 0 }]);
  XLSX.utils.book_append_sheet(wb, wsInstPayments, "Installment Payments");

  // 6. INSTALLMENT SCHEDULES SHEET
  const installmentScheduleRows: any[] = [];
  (data.installmentSchedules || []).forEach((sched) => {
    (sched.installments || []).forEach((inst: any) => {
      installmentScheduleRows.push({
        "Enrollment ID": sched.enrollmentId || sched.id || "",
        "Student Name": sched.studentName || "",
        "Course Name": sched.courseName || "",
        "Payment Plan Type": sched.paymentType || "emi",
        "Total Plan Fee": Number(sched.totalFee || 0),
        "Installment Number": inst.installmentNumber || "",
        "Scheduled Amount": Number(inst.amount || 0),
        "Due Date": inst.dueDate || "",
        "Status": inst.status || "Pending",
        "Installment Type": inst.type || ""
      });
    });
  });
  const wsInstSchedules = XLSX.utils.json_to_sheet(installmentScheduleRows.length ? installmentScheduleRows : [{ "Enrollment ID": "", "Scheduled Amount": 0 }]);
  XLSX.utils.book_append_sheet(wb, wsInstSchedules, "Installment Schedules");

  // 7. EXAM RECEIPTS SHEET
  const examReceiptRows = (data.examReceipts || []).map((er) => ({
    "Receipt ID": er.id || "",
    "Receipt Number": er.receiptNumber || "",
    "Receipt Date": er.receiptDate || "",
    "Enrollment ID": er.enrollmentId || "",
    "Student Name": er.studentName || "",
    "Course Name": er.courseName || "",
    "Total Amount": Number(er.totalAmount || 0),
    "Payment Mode": er.paymentMode || "",
    "Agreement": er.agreeTerms || "Agreed",
    "Issued By User": er.userId || "",
    "Timestamp": formatTimestamp(er.timestamp)
  }));
  const wsExamReceipts = XLSX.utils.json_to_sheet(examReceiptRows.length ? examReceiptRows : [{ "Receipt Number": "", "Total Amount": 0 }]);
  XLSX.utils.book_append_sheet(wb, wsExamReceipts, "Exam Receipts");

  // 8. COURSES SHEET
  const courseRows = (data.courses || []).map((c) => ({
    "Course ID": c.courseId || c.id || "",
    "Course Name": c.courseName || "",
    "Duration": c.duration || "",
    "Total Fees": Number(c.fees || 0),
    "Admission Fee": Number(c.admissionFee || 0),
    "Exam Fee": Number(c.examFee || 0),
    "Starting Year Fee": Number(c.startingYearFee || 0),
    "Active": c.active !== false ? "TRUE" : "FALSE",
    "Created By": c.createdBy || "Admin"
  }));
  const wsCourses = XLSX.utils.json_to_sheet(courseRows.length ? courseRows : [{ "Course ID": "", "Course Name": "" }]);
  XLSX.utils.book_append_sheet(wb, wsCourses, "Courses");

  return wb;
}

// Download Google Sheets Excel (.xlsx) file directly
export async function exportDataToGoogleSheetsXLSX(): Promise<{ success: boolean; filename: string }> {
  try {
    const data = await fetchAllPortalData();
    const wb = createGoogleSheetsWorkbook(data);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `TrustCare_Data_GoogleSheets_${dateStr}.xlsx`;
    XLSX.writeFile(wb, filename);
    return { success: true, filename };
  } catch (error: any) {
    console.error("Export to Excel/Google Sheets error:", error);
    throw new Error(error.message || "Failed to export data to Google Sheets format.");
  }
}

// Download Blank Template for Google Sheets
export function downloadBlankGoogleSheetsTemplate() {
  const emptyData = {
    inquiries: [
      {
        id: "INQ-SAMPLE-01",
        date: "2026-08-30",
        aadharNumber: "123456789012",
        firstName: "John",
        middleName: "D",
        lastName: "Doe",
        fullName: "John D Doe",
        phoneNo: "9876543210",
        whatsappNo: "9876543210",
        parentsNo: "9876543211",
        email: "student@example.com",
        interestedCourse: "DMLT",
        qualification: "12th Pass",
        age: 20,
        gender: "Male",
        branch: "kurla",
        addressLine1: "123 Street",
        addressLine2: "Kurla West",
        pincode: "400070",
        address: "123 Street, Kurla West, 400070",
        inquiryTakenBy: "Admin",
        status: "New Inquiry",
        admissionStatus: "Not Admitted"
      }
    ],
    admissions: [
      {
        enrollmentId: "TC-2026-001",
        receiptNumber: "AR-0001",
        date: "2026-08-30",
        studentName: "John D Doe",
        firstName: "John",
        middleName: "D",
        lastName: "Doe",
        email: "student@example.com",
        courseName: "DMLT",
        courseDuration: "2 Years",
        totalCourseFees: 60000,
        admissionFee: 5000,
        examFee: 2000,
        startingYearFee: 30000,
        paymentMode: "Cash",
        guardianName: "David Doe",
        guardianRelation: "Father",
        agreement: "Agreed",
        branch: "kurla",
        user: "Admin",
        photoUrl: ""
      }
    ],
    feeStructures: [
      {
        enrollmentId: "TC-2026-001",
        name: "John D Doe",
        courseName: "DMLT",
        paymentMode: "Cash",
        admissionFee: 5000,
        admissionFeeDue: 0,
        courseFee: 60000,
        courseFeeDue: 60000,
        examFee: 0,
        examFeeDue: 0,
        totalAmountDue: 60000,
        branch: "kurla",
        userName: "Admin"
      }
    ],
    courses: [
      {
        courseId: "dmlt",
        courseName: "DMLT",
        duration: "2 Years",
        fees: 60000,
        admissionFee: 5000,
        examFee: 2000,
        startingYearFee: 30000,
        active: true,
        createdBy: "Admin"
      }
    ]
  };

  const wb = createGoogleSheetsWorkbook(emptyData);
  XLSX.writeFile(wb, "TrustCare_GoogleSheets_Template.xlsx");
}

// Helper to fetch an image as Blob/Base64 without CORS limitations
async function fetchImageBlob(url: string, enrollmentId?: string): Promise<Blob | null> {
  if (!url) return null;

  // 1. If it's a Data URL (base64)
  if (url.startsWith("data:")) {
    try {
      const parts = url.split(",");
      const mime = parts[0].match(/:(.*?);/)?.[1] || "image/jpeg";
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    } catch (dataErr) {
      console.warn("Could not parse data URL:", dataErr);
    }
  }

  // 2. Try directly downloading via Firebase Storage SDK (no CORS issues)
  if (enrollmentId) {
    try {
      const storageRef = ref(storage, `student_photos/${enrollmentId}.jpg`);
      const blob = await getBlob(storageRef);
      if (blob && blob.size > 0) {
        return blob;
      }
    } catch (fbErr) {
      // Photo may be under another extension or URL
    }
  }

  // 3. Try fetching through server-side image proxy (bypasses browser CORS)
  try {
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    if (response.ok) {
      return await response.blob();
    }
  } catch (proxyErr) {
    console.warn(`Proxy fetch failed for ${url}:`, proxyErr);
  }

  // 4. Fallback: direct fetch
  try {
    const response = await fetch(url);
    if (response.ok) {
      return await response.blob();
    }
  } catch (err) {
    console.warn(`Could not download image from ${url}:`, err);
  }

  return null;
}

// Export Complete Backup Package (.zip) with XLSX Workbook + Downloaded Student Photos + JSON
export async function exportCompleteZipBackup(
  onProgress?: (message: string, percent: number) => void
): Promise<{ success: boolean; filename: string }> {
  try {
    onProgress?.("Fetching data from Firestore...", 10);
    const data = await fetchAllPortalData();

    const zip = new JSZip();
    const dateStr = new Date().toISOString().slice(0, 10);

    // 1. Generate Google Sheets Workbook (.xlsx)
    onProgress?.("Generating Google Sheets multi-tab Excel file...", 30);
    const wb = createGoogleSheetsWorkbook(data);
    const xlsxBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    zip.file("TrustCare_Complete_Data.xlsx", xlsxBuffer);

    // 2. Export Raw JSON Backup for lossless restoration
    onProgress?.("Creating JSON backup file...", 45);
    zip.file("trustcare_backup.json", JSON.stringify(data, null, 2));

    // 3. Download and package student photos
    const photosFolder = zip.folder("student_photos");
    const admissionsWithPhotos = (data.admissions || []).filter((a) => Boolean(a.photoUrl));
    const totalPhotos = admissionsWithPhotos.length;

    if (photosFolder && totalPhotos > 0) {
      let downloadedCount = 0;
      for (const adm of admissionsWithPhotos) {
        const enrollmentId = adm.enrollmentId || adm.id;
        if (adm.photoUrl && enrollmentId) {
          onProgress?.(
            `Downloading student photo (${downloadedCount + 1}/${totalPhotos}): ${enrollmentId}...`,
            45 + Math.round(((downloadedCount + 1) / totalPhotos) * 45)
          );

          const blob = await fetchImageBlob(adm.photoUrl, enrollmentId);
          if (blob) {
            photosFolder.file(`${enrollmentId}.jpg`, blob);
          }
          downloadedCount++;
        }
      }
    }

    onProgress?.("Compressing archive...", 95);
    const zipBlob = await zip.generateAsync({ type: "blob" });

    const filename = `TrustCare_Complete_Backup_${dateStr}.zip`;
    const downloadUrl = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);

    onProgress?.("Backup completed successfully!", 100);
    return { success: true, filename };
  } catch (error: any) {
    console.error("ZIP Export error:", error);
    throw new Error(error.message || "Failed to generate complete ZIP backup.");
  }
}

// Parse an uploaded file (.xlsx, .zip, or .json) and extract records and photos
export async function parseBackupFile(
  file: File,
  onProgress?: (message: string, percent: number) => void
): Promise<ParsedImportData> {
  const filename = file.name.toLowerCase();

  const result: ParsedImportData = {
    summary: {
      inquiriesCount: 0,
      admissionsCount: 0,
      feeStructuresCount: 0,
      dueFeesCount: 0,
      installmentSchedulesCount: 0,
      installmentPaymentsCount: 0,
      examReceiptsCount: 0,
      coursesCount: 0,
      photosCount: 0
    },
    inquiries: [],
    admissions: [],
    feeStructures: [],
    installmentSchedules: [],
    installmentPayments: [],
    examReceipts: [],
    courses: [],
    photos: {}
  };

  if (filename.endsWith(".json")) {
    onProgress?.("Reading JSON backup file...", 30);
    const text = await file.text();
    const parsed = JSON.parse(text);

    result.inquiries = parsed.inquiries || [];
    result.admissions = parsed.admissions || [];
    result.feeStructures = parsed.feeStructures || [];
    result.installmentSchedules = parsed.installmentSchedules || [];
    result.installmentPayments = parsed.installmentPayments || [];
    result.examReceipts = parsed.examReceipts || [];
    result.courses = parsed.courses || [];
  } else if (filename.endsWith(".zip")) {
    onProgress?.("Extracting ZIP archive...", 20);
    const zip = await JSZip.loadAsync(file);

    // Look for JSON or XLSX inside ZIP
    const jsonFile = zip.file("trustcare_backup.json") || zip.file(/^.*\.json$/i)[0];
    const xlsxFile = zip.file("TrustCare_Complete_Data.xlsx") || zip.file(/^.*\.xlsx$/i)[0];

    if (jsonFile) {
      onProgress?.("Reading embedded JSON data...", 40);
      const content = await jsonFile.async("text");
      const parsed = JSON.parse(content);
      result.inquiries = parsed.inquiries || [];
      result.admissions = parsed.admissions || [];
      result.feeStructures = parsed.feeStructures || [];
      result.installmentSchedules = parsed.installmentSchedules || [];
      result.installmentPayments = parsed.installmentPayments || [];
      result.examReceipts = parsed.examReceipts || [];
      result.courses = parsed.courses || [];
    } else if (xlsxFile) {
      onProgress?.("Reading embedded Excel workbook...", 40);
      const arrayBuffer = await xlsxFile.async("arraybuffer");
      const wb = XLSX.read(arrayBuffer, { type: "array" });
      parseWorkbookIntoResult(wb, result);
    }

    // Look for photos in student_photos/ folder or matching image files
    onProgress?.("Scanning for student photos in archive...", 60);
    const photoFiles = zip.file(/^student_photos\/.*\.(jpg|jpeg|png|webp)$/i);
    for (const pFile of photoFiles) {
      const parts = pFile.name.split("/");
      const fileNameWithExt = parts[parts.length - 1];
      const enrollmentId = fileNameWithExt.replace(/\.(jpg|jpeg|png|webp)$/i, "").trim();
      if (enrollmentId) {
        const blob = await pFile.async("blob");
        result.photos[enrollmentId] = blob;
      }
    }
  } else if (filename.endsWith(".xlsx") || filename.endsWith(".xls") || filename.endsWith(".csv")) {
    onProgress?.("Reading Google Sheets / Excel workbook...", 30);
    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: "array" });
    parseWorkbookIntoResult(wb, result);
  } else {
    throw new Error("Unsupported file format. Please upload a .xlsx, .zip, or .json file.");
  }

  // Calculate summary counts
  result.summary.inquiriesCount = result.inquiries.length;
  result.summary.admissionsCount = result.admissions.length;
  result.summary.feeStructuresCount = result.feeStructures.length;
  result.summary.dueFeesCount = result.feeStructures.filter((f) => Number(f.totalAmountDue || 0) > 0).length;
  result.summary.installmentSchedulesCount = result.installmentSchedules.length;
  result.summary.installmentPaymentsCount = result.installmentPayments.length;
  result.summary.examReceiptsCount = result.examReceipts.length;
  result.summary.coursesCount = result.courses.length;
  result.summary.photosCount = Object.keys(result.photos).length;

  onProgress?.("File parsing complete!", 100);
  return result;
}

// Parse Excel Workbook tabs into parsed data structure
function parseWorkbookIntoResult(wb: XLSX.WorkBook, result: ParsedImportData) {
  wb.SheetNames.forEach((sheetName) => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;
    const rows = XLSX.utils.sheet_to_json<any>(ws);

    const name = sheetName.trim().toLowerCase();
    if (name.includes("inquiry")) {
      rows.forEach((row) => {
        if (!row["Aadhaar Number"] && !row["Full Name"] && !row["Phone Number"]) return;
        result.inquiries.push({
          id: row["Inquiry ID"] || undefined,
          date: row["Date"] || new Date().toISOString().slice(0, 10),
          aadharNumber: String(row["Aadhaar Number"] || "").trim(),
          firstName: row["First Name"] || "",
          middleName: row["Middle Name"] || "",
          lastName: row["Last Name"] || "",
          fullName: row["Full Name"] || `${row["First Name"] || ""} ${row["Last Name"] || ""}`.trim(),
          phoneNo: String(row["Phone Number"] || "").trim(),
          whatsappNo: String(row["WhatsApp Number"] || row["Phone Number"] || "").trim(),
          parentsNo: String(row["Parents Phone"] || "").trim(),
          email: row["Email"] || "",
          interestedCourse: row["Interested Course"] || "",
          qualification: row["Qualification"] || "",
          age: Number(row["Age"] || 0),
          gender: row["Gender"] || "Male",
          branch: row["Branch"] || "kurla",
          addressLine1: row["Address Line 1"] || "",
          addressLine2: row["Address Line 2"] || "",
          addressLine3: row["Address Line 3"] || "",
          pincode: String(row["Pincode"] || ""),
          address: row["Full Address"] || "",
          inquiryTakenBy: row["Inquiry Taken By"] || "Admin",
          status: row["Status"] || "New Inquiry",
          admissionStatus: row["Admission Status"] || "Not Admitted",
          admissionDate: row["Admission Date"] || "",
          timestamp: row["Created Timestamp"] ? new Date(row["Created Timestamp"]) : Timestamp.now()
        });
      });
    } else if (name.includes("admission")) {
      rows.forEach((row) => {
        const enrollmentId = String(row["Enrollment ID"] || "").trim();
        if (!enrollmentId && !row["Student Name"]) return;
        const finalId = enrollmentId || `TC-${Date.now()}`;
        result.admissions.push({
          id: finalId,
          enrollmentId: finalId,
          receiptNumber: row["Receipt Number"] || "AR-0001",
          date: row["Admission Date"] || new Date().toISOString().slice(0, 10),
          studentName: row["Student Name"] || `${row["First Name"] || ""} ${row["Last Name"] || ""}`.trim(),
          firstName: row["First Name"] || "",
          middleName: row["Middle Name"] || "",
          lastName: row["Last Name"] || "",
          email: row["Email Address"] || row["Email"] || "",
          courseName: row["Course Name"] || "",
          courseDuration: row["Course Duration"] || "",
          totalCourseFees: Number(row["Total Course Fees"] || 0),
          admissionFee: Number(row["Admission Fee"] || 0),
          examFee: Number(row["Exam Fee"] || 0),
          startingYearFee: Number(row["Starting Year Fee"] || 0),
          paymentMode: row["Payment Mode"] || "Cash",
          guardianName: row["Guardian Name"] || "",
          guardianRelation: row["Guardian Relation"] || "",
          agreement: row["Terms Agreement"] || "Agreed",
          branch: row["Branch"] || "kurla",
          user: row["Created By"] || "Admin",
          photoUrl: row["Student Photo URL"] || "",
          timestamp: row["Created Timestamp"] ? new Date(row["Created Timestamp"]) : Timestamp.now()
        });
      });
    } else if (name.includes("fees") && !name.includes("due")) {
      rows.forEach((row) => {
        const enrollmentId = String(row["Enrollment ID"] || "").trim();
        if (!enrollmentId) return;
        result.feeStructures.push({
          id: enrollmentId,
          enrollmentId: enrollmentId,
          name: row["Student Name"] || row["Name"] || "",
          courseName: row["Course Name"] || "",
          paymentMode: row["Payment Mode"] || "Cash",
          admissionFee: Number(row["Admission Fee"] || 0),
          admissionFeeDue: Number(row["Admission Fee Due"] || 0),
          courseFee: Number(row["Course Fee"] || 0),
          courseFeeDue: Number(row["Course Fee Due"] || 0),
          examFee: Number(row["Exam Fee"] || 0),
          examFeeDue: Number(row["Exam Fee Due"] || 0),
          totalAmountDue: Number(row["Total Amount Due"] || 0),
          branch: row["Branch"] || "kurla",
          userName: row["User / Officer"] || row["User"] || "Admin",
          timestamp: row["Updated Timestamp"] ? new Date(row["Updated Timestamp"]) : Timestamp.now()
        });
      });
    } else if (name.includes("course")) {
      rows.forEach((row) => {
        const courseId = String(row["Course ID"] || "").trim().toLowerCase();
        if (!courseId || !row["Course Name"]) return;
        result.courses.push({
          id: courseId,
          courseId: courseId,
          courseName: row["Course Name"],
          duration: row["Duration"] || "",
          fees: Number(row["Total Fees"] || row["Fees"] || 0),
          admissionFee: Number(row["Admission Fee"] || 0),
          examFee: Number(row["Exam Fee"] || 0),
          startingYearFee: Number(row["Starting Year Fee"] || 0),
          active: row["Active"] !== "FALSE" && row["Active"] !== false,
          createdBy: row["Created By"] || "Admin"
        });
      });
    }
  });
}

// Execute Import to Firebase (writes to Firestore collections & uploads student photos)
export async function executeImportData(
  parsedData: ParsedImportData,
  options: { uploadPhotos?: boolean },
  onProgress?: (message: string, percent: number) => void
): Promise<{ success: boolean; message: string; stats: any }> {
  try {
    const stats = {
      admissionsImported: 0,
      inquiriesImported: 0,
      feeStructuresImported: 0,
      coursesImported: 0,
      photosUploaded: 0
    };

    // 1. Upload Photos if provided and available
    const photoIds = Object.keys(parsedData.photos);
    if (photoIds.length > 0 && options.uploadPhotos !== false) {
      let photoIdx = 0;
      for (const enrollmentId of photoIds) {
        const photoBlob = parsedData.photos[enrollmentId];
        photoIdx++;
        onProgress?.(
          `Uploading student photo (${photoIdx}/${photoIds.length}): ${enrollmentId}...`,
          Math.round((photoIdx / photoIds.length) * 25)
        );

        try {
          if (photoBlob instanceof Blob) {
            const photoRef = ref(storage, `student_photos/${enrollmentId}.jpg`);
            await uploadBytes(photoRef, photoBlob);
            const downloadUrl = await getDownloadURL(photoRef);

            // Update matching admission record in memory
            const adm = parsedData.admissions.find((a) => a.enrollmentId === enrollmentId || a.id === enrollmentId);
            if (adm) {
              adm.photoUrl = downloadUrl;
            }
            stats.photosUploaded++;
          }
        } catch (photoErr) {
          console.warn(`Failed to upload photo for ${enrollmentId}:`, photoErr);
        }
      }
    }

    // 2. Save Admissions
    onProgress?.("Importing Admissions to database...", 30);
    for (const adm of parsedData.admissions) {
      const id = adm.enrollmentId || adm.id;
      if (!id) continue;
      const docRef = doc(db, "admissions", id);
      await setDoc(docRef, {
        ...adm,
        timestamp: adm.timestamp instanceof Date ? Timestamp.fromDate(adm.timestamp) : Timestamp.now()
      }, { merge: true });

      // Also ensure enrollment doc exists
      await setDoc(doc(db, "enrollments", id), {
        enrollmentId: id,
        studentName: adm.studentName,
        course: adm.courseName,
        date: adm.date || new Date().toLocaleDateString("en-GB"),
        status: "Active"
      }, { merge: true });

      stats.admissionsImported++;
    }

    // 3. Save Inquiries
    onProgress?.("Importing Inquiries to database...", 55);
    for (const inq of parsedData.inquiries) {
      const docRef = inq.id ? doc(db, "inquiries", inq.id) : doc(collection(db, "inquiries"));
      await setDoc(docRef, {
        ...inq,
        timestamp: inq.timestamp instanceof Date ? Timestamp.fromDate(inq.timestamp) : Timestamp.now()
      }, { merge: true });
      stats.inquiriesImported++;
    }

    // 4. Save Fee Structures
    onProgress?.("Importing Fee Structures and Due Balances...", 75);
    for (const fee of parsedData.feeStructures) {
      const id = fee.enrollmentId || fee.id;
      if (!id) continue;
      const docRef = doc(db, "feeStructures", id);
      await setDoc(docRef, {
        ...fee,
        timestamp: fee.timestamp instanceof Date ? Timestamp.fromDate(fee.timestamp) : Timestamp.now()
      }, { merge: true });
      stats.feeStructuresImported++;
    }

    // 5. Save Courses
    if (parsedData.courses.length > 0) {
      onProgress?.("Importing Course catalog...", 90);
      for (const course of parsedData.courses) {
        const id = course.courseId || course.id;
        if (!id) continue;
        const docRef = doc(db, "courses", id);
        await setDoc(docRef, {
          ...course,
          updatedAt: Timestamp.now()
        }, { merge: true });
        stats.coursesImported++;
      }
    }

    onProgress?.("Import completed successfully!", 100);
    return {
      success: true,
      message: `Import completed! Successfully imported ${stats.admissionsImported} admissions, ${stats.inquiriesImported} inquiries, ${stats.feeStructuresImported} fee records, and ${stats.photosUploaded} student photos.`,
      stats
    };
  } catch (error: any) {
    console.error("Execute import error:", error);
    throw new Error(error.message || "Failed to import data into database.");
  }
}
