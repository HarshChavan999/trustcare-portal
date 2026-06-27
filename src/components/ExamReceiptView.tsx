import React, { useState, useEffect } from "react";
import { UserProfile } from "../lib/services/authService";
import { 
  getStudentDataByEnrollmentId, 
  saveExamReceipt, 
  getNextReceiptNumberEF,
  ExamReceiptData
} from "../lib/services/paymentService";
import { 
  Receipt, 
  Loader2, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Printer,
  X
} from "lucide-react";

interface ExamReceiptViewProps {
  userProfile: UserProfile | null;
  onGoBack?: () => void;
}

const getExamFee = (branch: string, courseName: string) => {
  const branchLower = (branch || "kurla").toLowerCase();
  
  if (branchLower === "karad") {
    const course = String(courseName).toLowerCase();
    if (course.includes("parlour")) {
      return 1000;
    }
    return 6000;
  }
  
  return 500; // Default for Kurla, Thane, Nalasapora
};

export default function ExamReceiptView({ userProfile, onGoBack }: ExamReceiptViewProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState("");
  const [receiptDate, setReceiptDate] = useState("");
  
  // Form fields
  const [enrollmentId, setEnrollmentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [courseName, setCourseName] = useState("");
  const [branch, setBranch] = useState("");
  const [totalAmount, setTotalAmount] = useState(500);
  const [paymentMode, setPaymentMode] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showNotification = (message: string, type: "success" | "error" | "info" = "info") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  // Generate Receipt Number and Date on mount
  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      try {
        const nextReceipt = await getNextReceiptNumberEF();
        setReceiptNumber(nextReceipt);
        
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        setReceiptDate(`${dd}/${mm}/${yyyy}`);
      } catch (error) {
        console.error("Error loading receipt number:", error);
        showNotification("Failed to load receipt number", "error");
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);

  // Fetch student info on blur of enrollmentId
  const handleEnrollmentIdBlur = async () => {
    const trimmedId = enrollmentId.trim();
    if (!trimmedId) return;

    showNotification("Fetching student data...", "info");
    try {
      const res = await getStudentDataByEnrollmentId(trimmedId);
      if (res.success) {
        setStudentName(res.studentName || "");
        setCourseName(res.courseName || "");
        
        const studentBranch = res.branch || userProfile?.branch || "kurla";
        setBranch(studentBranch);
        
        const fee = getExamFee(studentBranch, res.courseName || "");
        setTotalAmount(fee);
        
        showNotification("Student data loaded successfully!", "success");
      } else {
        showNotification("Enrollment ID not found or invalid", "error");
        setStudentName("");
        setCourseName("");
        setTotalAmount(500);
      }
    } catch (error) {
      showNotification("Error loading student data", "error");
      console.error(error);
    }
  };

  // Generate HTML for printer double receipt
  const printReceipt = (receiptNo: string, dateStr: string, name: string, course: string, amt: number, mode: string, studentBranch: string) => {
    const logoBase64 = "https://i.postimg.cc/15z0wxhX/cropped-circle-image-(1).png";
    const formattedAmount = "₹" + amt.toFixed(2);
    
    const receiptHTML = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Exam Receipt - ${receiptNo}</title>
          <style>
              @page { size: A4; margin: 0.5in; }
              body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: white; color: black; }
              .page-container { width: 210mm; display: flex; flex-direction: column; padding: 10mm; box-sizing: border-box; }
              .receipt { width: 100%; border: 3px solid #000; border-radius: 15px; padding: 15px; box-sizing: border-box; background: white; margin-bottom: 10mm; page-break-inside: avoid; }
              .header { display: flex; align-items: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px; }
              .logo img { width: 65px; height: auto; }
              .institute-name { font-size: 28px; font-weight: bold; color: #000; flex-grow: 1; letter-spacing: 1px; text-align: center; }
              .receipt-label { background: #333; color: white; padding: 5px 15px; border-radius: 20px; font-size: 14px; font-weight: bold; }
              .receipt-content { display: flex; flex-direction: column; }
              .receipt-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
              .receipt-no, .date, .branch { font-size: 16px; font-weight: bold; }
              .form-fields { flex-grow: 1; display: flex; flex-direction: column; gap: 12px; }
              .field-row { display: flex; align-items: center; font-size: 14px; font-weight: bold; }
              .field-label { min-width: 140px; color: #000; }
              .field-value { flex-grow: 1; border-bottom: 1px solid #000; padding: 2px 5px; min-height: 20px; color: #0066cc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
              .footer { margin-top: 25px; display: flex; justify-content: space-between; align-items: flex-end; }
              .note { font-size: 14px; font-weight: bold; max-width: 60%; }
              .signature-area { text-align: center; min-width: 150px; }
              .signature-line { border-bottom: 1px solid #000; height: 40px; margin-bottom: 5px; }
              .signature-label { font-size: 14px; font-weight: bold; }
              @media print { 
                  .page-container { width: 100%; padding: 0; } 
                  body { padding: 0; }
              }
          </style>
      </head>
      <body>
          <div class="page-container">
              <!-- First Receipt: Student Copy -->
              <div class="receipt">
                  <div class="header">
                      <div class="logo"><img src="${logoBase64}"></div> 
                      <div class="institute-name">TRUSTCARE</div>
                      <div class="receipt-label">STUDENT COPY</div>
                  </div>
                  <div class="receipt-content">
                      <div class="receipt-info">
                          <div class="receipt-no">Receipt No. ${receiptNo}</div>
                          <div class="branch">Branch: ${studentBranch.toUpperCase()}</div>
                          <div class="date">Date: ${dateStr}</div>
                      </div>
                      <div class="form-fields">
                          <div class="field-row">
                              <div class="field-label">Student Name:</div>
                              <div class="field-value">${name}</div>
                          </div>
                          <div class="field-row">
                              <div class="field-label">Course Name:</div>
                              <div class="field-value">${course}</div>
                          </div>
                          <div class="field-row">
                              <div class="field-label">Total Amount:</div>
                              <div class="field-value">${formattedAmount}</div>
                          </div>
                          <div class="field-row">
                              <div class="field-label">Payment Mode:</div>
                              <div class="field-value">${mode}</div>
                          </div>
                      </div>
                      <div class="footer">
                          <div class="note">• Fees once paid are non-refundable</div>
                          <div class="signature-area">
                              <div class="signature-line"></div>
                              <div class="signature-label">Authorized Signature</div>
                          </div>
                      </div>
                  </div>
              </div>
              
              <div style="border: 2px dashed #000; margin: 25px 0;"></div>
              
              <!-- Second Receipt: Office Copy -->
              <div class="receipt">
                  <div class="header">
                      <div class="logo"><img src="${logoBase64}"></div> 
                      <div class="institute-name">TRUSTCARE</div>
                      <div class="receipt-label">OFFICE COPY</div>
                  </div>
                  <div class="receipt-content">
                      <div class="receipt-info">
                          <div class="receipt-no">Receipt No. ${receiptNo}</div>
                          <div class="branch">Branch: ${studentBranch.toUpperCase()}</div>
                          <div class="date">Date: ${dateStr}</div>
                      </div>
                      <div class="form-fields">
                          <div class="field-row">
                              <div class="field-label">Student Name:</div>
                              <div class="field-value">${name}</div>
                          </div>
                          <div class="field-row">
                              <div class="field-label">Course Name:</div>
                              <div class="field-value">${course}</div>
                          </div>
                          <div class="field-row">
                              <div class="field-label">Total Amount:</div>
                              <div class="field-value">${formattedAmount}</div>
                          </div>
                          <div class="field-row">
                              <div class="field-label">Payment Mode:</div>
                              <div class="field-value">${mode}</div>
                          </div>
                      </div>
                      <div class="footer">
                          <div class="note">• Fees once paid are non-refundable</div>
                          <div class="signature-area">
                              <div class="signature-line"></div>
                              <div class="signature-label">Authorized Signature</div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
          <script>
              setTimeout(() => {
                  window.print();
              }, 500);
          </script>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=800,height=1000");
    if (printWindow) {
      printWindow.document.write(receiptHTML);
      printWindow.document.close();
    } else {
      showNotification("Popup blocked! Please allow popups to print receipts.", "error");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreeTerms) {
      showNotification("Please agree to the terms and conditions.", "error");
      return;
    }
    if (!enrollmentId || !studentName || !courseName) {
      showNotification("Please enter a valid Enrollment ID and make sure student info is fetched.", "error");
      return;
    }
    if (!paymentMode) {
      showNotification("Please select a payment mode.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const receiptData: ExamReceiptData = {
        receiptDate,
        receiptNumber,
        enrollmentId,
        studentName,
        courseName,
        totalAmount,
        paymentMode,
        agreeTerms: agreeTerms ? "Agreed" : "Not Agreed",
        userId: userProfile?.username || "Admin"
      };

      const res = await saveExamReceipt(receiptData);
      if (res.success) {
        showNotification("Exam fee receipt saved successfully! Printing...", "success");
        
        // Print the receipt double layout
        printReceipt(receiptNumber, receiptDate, studentName, courseName, totalAmount, paymentMode, branch);
        
        // Reset form except date
        setEnrollmentId("");
        setStudentName("");
        setCourseName("");
        setPaymentMode("");
        setAgreeTerms(false);
        setBranch("");
        
        // Load next receipt number
        const nextReceipt = await getNextReceiptNumberEF();
        setReceiptNumber(nextReceipt);
      } else {
        showNotification(res.message || "Failed to save receipt. Please try again.", "error");
      }
    } catch (error: any) {
      showNotification("Error saving exam receipt: " + error.message, "error");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto bg-slate-900/40 border border-slate-900/60 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl overflow-hidden mt-4 glass-panel gpu-accelerated">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-6 right-6 z-50 p-4 rounded-xl shadow-lg border backdrop-blur-md transition-all duration-300 transform translate-y-0 ${
          notification.type === "success" 
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
            : notification.type === "error"
            ? "bg-rose-500/10 border-rose-500/20 text-rose-450"
            : "bg-teal-500/10 border-teal-500/20 text-teal-400"
        }`}>
          <div className="flex items-center gap-2.5">
            {notification.type === "success" && <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />}
            {notification.type === "error" && <AlertTriangle className="h-4.5 w-4.5 text-rose-450" />}
            {notification.type === "info" && <Info className="h-4.5 w-4.5 text-teal-400" />}
            <span className="text-xs font-semibold">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Glow Effects */}
      <div className="absolute top-0 right-0 -z-10 h-32 w-32 bg-teal-500/10 blur-2xl rounded-full" />
      <div className="absolute bottom-0 left-0 -z-10 h-32 w-32 bg-indigo-500/10 blur-2xl rounded-full" />

      {/* Header */}
      <div className="border-b border-slate-900 pb-4 mb-6 text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-teal-600 to-indigo-600 bg-clip-text text-transparent flex items-center justify-center gap-3">
          <Receipt className="h-7 w-7 text-teal-400" />EXAM FEE RECEIPT
        </h1>
        <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-semibold">Record exam fee payments and generate receipts</p>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
          <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Generating receipt code...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Enrollment ID Field */}
          <div className="space-y-1.5">
            <label htmlFor="enrollmentId" className="block text-xs font-semibold text-slate-400">
              Enrollment ID <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                id="enrollmentId"
                value={enrollmentId}
                onChange={(e) => setEnrollmentId(e.target.value)}
                onBlur={handleEnrollmentIdBlur}
                placeholder="Enter Student Enrollment ID (e.g. ST001)"
                className="w-full bg-slate-950/80 border border-slate-850 focus:border-teal-500/50 rounded-xl pl-4 pr-10 py-2.5 text-sm text-slate-100 placeholder-slate-700 focus:outline-none transition-colors font-medium"
                required
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                <Search className="h-4 w-4 text-slate-600" />
              </div>
            </div>
          </div>

          {/* Date & Receipt Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400">Date</label>
              <input
                type="text"
                value={receiptDate}
                readOnly
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400">Receipt Number</label>
              <input
                type="text"
                value={receiptNumber}
                readOnly
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed font-semibold"
              />
            </div>
          </div>

          {/* Student Info (Fetched) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400">Student Name</label>
              <input
                type="text"
                value={studentName}
                readOnly
                placeholder="Lookup by Enrollment ID..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed placeholder-slate-700 font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400">Course Name</label>
              <input
                type="text"
                value={courseName ? courseName.replace(/_/g, " ").toUpperCase() : ""}
                readOnly
                placeholder="Lookup by Enrollment ID..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed placeholder-slate-700 font-semibold"
              />
            </div>
          </div>

          {/* Amount & Payment Mode */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400">Exam Fee Amount (₹)</label>
              <input
                type="text"
                value={`₹${totalAmount.toLocaleString()}`}
                readOnly
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-teal-400 cursor-not-allowed font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="paymentMode" className="block text-xs font-semibold text-slate-400">
                Payment Mode <span className="text-rose-500">*</span>
              </label>
              <select
                id="paymentMode"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-855 focus:border-teal-500/50 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none transition-colors font-medium cursor-pointer"
                required
              >
                <option value="">Select Payment Mode</option>
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="Credit/Debit Card">Credit/Debit Card</option>
              </select>
            </div>
          </div>

          {/* Terms Agreement Checkbox */}
          <div className="pt-2">
            <label className="flex items-start cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="h-4.5 w-4.5 mt-0.5 text-teal-500 border-slate-800 bg-slate-950 rounded focus:ring-teal-500/30 focus:ring-offset-slate-950 cursor-pointer"
                required
              />
              <span className="ml-2.5 text-xs text-slate-400 leading-normal font-medium">
                I acknowledge and agree to the payment details above. Fees once paid are non-refundable.
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="border-t border-slate-900 pt-6 mt-6 flex justify-end gap-3">
            {onGoBack && (
              <button
                type="button"
                onClick={onGoBack}
                className="px-6 py-2.5 btn-secondary text-xs rounded-xl cursor-pointer"
              >
                Back
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 btn-primary text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wide"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Printer className="h-4 w-4" />
                  Generate & Print Receipt
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
