import React, { useState, useEffect } from "react";
import { UserProfile } from "../lib/services/authService";
import {
  getStudentDataByEnrollmentId,
  saveCoursePayment,
  saveInstallmentSchedule,
  loadInstallmentSchedule,
  getInstallmentPaymentsForStudent,
  saveInstallmentPayment,
  Installment,
  PaymentSchedule
} from "../lib/services/paymentService";

interface PaymentViewProps {
  userProfile: UserProfile | null;
  initialEnrollmentId: string | null;
  initialStudentName: string | null;
  initialCourseName: string | null;
  initialTotalFees: number | null;
  initialReceiptNo: string | null;
  onGoBack: () => void;
  onProceedToReceipt: (receiptNo: string, enrollmentId: string) => void;
}

// Default course config (fallback)
const DEFAULT_COURSE_CONFIG: { [course: string]: { duration: string; fees: number } } = {
  anm_nursing: { duration: "1 year", fees: 65000 },
  gnm_nursing: { duration: "3 years", fees: 100000 },
  dmlt: { duration: "1 year", fees: 70000 },
  ot_technician: { duration: "1 year", fees: 30000 },
  general_nursing: { duration: "1 year", fees: 30000 }
};

export default function PaymentView({
  userProfile,
  initialEnrollmentId,
  initialStudentName,
  initialCourseName,
  initialTotalFees,
  initialReceiptNo,
  onGoBack,
  onProceedToReceipt
}: PaymentViewProps) {
  const [receiptNo, setReceiptNo] = useState(initialReceiptNo || "");
  const [studentName, setStudentName] = useState(initialStudentName || "");
  const [enrollmentId, setEnrollmentId] = useState(initialEnrollmentId || "");
  const [courseName, setCourseName] = useState(initialCourseName || "");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const config = DEFAULT_COURSE_CONFIG[courseName] || { duration: "1 year", fees: 30000 };
  const years = config.duration.includes("year") || config.duration.includes("Year")
    ? parseInt(config.duration.split(" ")[0]) || 1
    : 1;
  const totalFees = initialTotalFees || (years * config.fees);

  const [paymentType, setPaymentType] = useState<"full" | "partial" | "emi" | "">("");
  const [discountRupees, setDiscountRupees] = useState(0);
  const [partialInitial, setPartialInitial] = useState(0);
  const [partialTenure, setPartialTenure] = useState(6);
  const [emiDownPayment, setEmiDownPayment] = useState(0);
  const [emiTenure, setEmiTenure] = useState(6);
  const [locked, setLocked] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [schedule, setSchedule] = useState<Installment[]>([]);
  const [processingPayment, setProcessingPayment] = useState<number | null>(null);
  const [printReceiptData, setPrintReceiptData] = useState<any | null>(null);

  useEffect(() => {
    if (initialEnrollmentId) {
      setEnrollmentId(initialEnrollmentId);
      setStudentName(initialStudentName || "");
      setCourseName(initialCourseName || "");
      setReceiptNo(initialReceiptNo || "");
      checkExistingSchedule(initialEnrollmentId);
    }
  }, [initialEnrollmentId]);

  const checkExistingSchedule = async (id: string) => {
    setLoading(true);
    try {
      const saved = await loadInstallmentSchedule(id);
      if (saved && saved.length > 0) {
        setSchedule(saved);
        setLocked(true);
        setConfirmed(true);
        const firstDoc = await getStudentDataByEnrollmentId(id);
        if (firstDoc.success) {
          const hist = await getInstallmentPaymentsForStudent(id);
          if (hist) setPaymentMethod(hist.paymentMethod || "Cash");
        }
      }
    } catch (e) {
      console.warn("Failed checking existing schedule:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollmentSearch = async () => {
    if (!enrollmentId.trim()) return;
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await getStudentDataByEnrollmentId(enrollmentId.trim());
      if (res.success && res.studentName) {
        setStudentName(res.studentName);
        setCourseName(res.courseName);
        setReceiptNo(res.receiptNumber || "");
        await checkExistingSchedule(enrollmentId.trim());
      } else {
        setErrorMsg("Enrollment ID not found in database.");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Failed search.");
    } finally {
      setLoading(false);
    }
  };

  const fullDiscountPercent = totalFees > 0 ? ((discountRupees / totalFees) * 100).toFixed(1) : "0";
  const fullTotalPayable = Math.max(0, totalFees - discountRupees);
  const partialDiscountedTotal = Math.max(0, totalFees - discountRupees);
  const partialRemaining = Math.max(0, partialDiscountedTotal - partialInitial);
  const partialEMIAmount = partialRemaining > 0 ? Math.ceil(partialRemaining / partialTenure) : 0;
  const partialTotalPayable = partialInitial + (partialEMIAmount * partialTenure);
  const emiDiscountedTotal = Math.max(0, totalFees - discountRupees);
  const emiRemaining = Math.max(0, emiDiscountedTotal - emiDownPayment);
  const emiEMIAmount = emiRemaining > 0 ? Math.ceil(emiRemaining / emiTenure) : 0;
  const emiTotalPayable = emiDownPayment + (emiEMIAmount * emiTenure);

  const handleConfirmPlan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!paymentType) { alert("Please select a payment card options first."); e.target.checked = false; return; }
    if (!paymentMethod) { alert("Please select a payment method first."); e.target.checked = false; return; }
    const planLabel = paymentType === "full" ? "Full Payment" : paymentType === "partial" ? "Partial Payment" : "EMI Plan";
    if (!window.confirm(`Are you sure you want to proceed with ${planLabel}?\n\nThis will lock your payment selection and generate the installment schedule.`)) {
      e.target.checked = false; return;
    }
    setLoading(true); setLocked(true); setConfirmed(true);
    const scheduleArray: Installment[] = [];
    const today = new Date().toISOString().split("T")[0];
    if (paymentType === "full") {
      scheduleArray.push({ installmentNumber: 1, amount: fullTotalPayable, dueDate: today, status: "Pending", type: "Full Payment" });
    } else if (paymentType === "partial") {
      let counter = 1;
      if (partialInitial > 0) scheduleArray.push({ installmentNumber: counter++, amount: partialInitial, dueDate: today, status: "Pending", type: "Initial Payment" });
      for (let i = 1; i <= partialTenure; i++) {
        const nextMonth = new Date(); nextMonth.setMonth(nextMonth.getMonth() + i);
        scheduleArray.push({ installmentNumber: counter++, amount: partialEMIAmount, dueDate: nextMonth.toISOString().split("T")[0], status: "Pending", type: `Installment ${counter - 1}` });
      }
    } else if (paymentType === "emi") {
      let counter = 1;
      if (emiDownPayment > 0) scheduleArray.push({ installmentNumber: counter++, amount: emiDownPayment, dueDate: today, status: "Pending", type: "Down Payment" });
      for (let i = 1; i <= emiTenure; i++) {
        const nextMonth = new Date(); nextMonth.setMonth(nextMonth.getMonth() + i);
        scheduleArray.push({ installmentNumber: counter++, amount: emiEMIAmount, dueDate: nextMonth.toISOString().split("T")[0], status: "Pending", type: `Installment ${counter - 1}` });
      }
    }
    setSchedule(scheduleArray);
    const activePayFees = paymentType === "full" ? fullTotalPayable : paymentType === "partial" ? partialTotalPayable : emiTotalPayable;
    try {
      await saveCoursePayment({ enrollmentId, studentName, courseName, paymentMode: paymentMethod, totalFees, coursePayFees: activePayFees, paymentType, loggedInUserId: userProfile?.username || "Admin", branch: "main" });
      const scheduleDoc: PaymentSchedule = { enrollmentId, studentName, courseName, paymentType, totalFee: activePayFees, installments: scheduleArray, loggedInUser: userProfile?.username || "Admin" };
      await saveInstallmentSchedule(scheduleDoc);
      setSuccessMsg("Payment plan locked and schedule saved successfully!");
    } catch (err: any) { setErrorMsg("Failed to lock plan: " + err.message); setLocked(false); setConfirmed(false); }
    finally { setLoading(false); }
  };

  const handleMarkAsPaid = async (inst: Installment) => {
    if (!window.confirm(`Are you sure the payment has been completed?\n\nInstallment: ${inst.installmentNumber}\nAmount: ₹${inst.amount.toLocaleString()}`)) return;
    setProcessingPayment(inst.installmentNumber); setErrorMsg("");
    try {
      const res = await saveInstallmentPayment({ enrollmentId, studentName, courseName, installmentNumber: inst.installmentNumber, installmentAmount: inst.amount, paymentMethod, paymentDate: new Date().toISOString().split("T")[0], loggedInUser: userProfile?.username || "Admin" });
      if (res.success) { setSuccessMsg(`Installment ${inst.installmentNumber} recorded successfully!`); await checkExistingSchedule(enrollmentId); }
      else setErrorMsg(res.message || "Failed to record payment.");
    } catch (err: any) { setErrorMsg(err.message || "Error saving payment."); }
    finally { setProcessingPayment(null); }
  };

  const handlePrintReceipt = (inst: Installment) => {
    setPrintReceiptData({
      receiptNumber: `IR${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toLocaleDateString("en-GB"),
      studentName, courseName: courseName.replace("_", " ").toUpperCase(),
      installmentNumber: inst.installmentNumber, amountPaid: inst.amount,
      paymentMode: paymentMethod, receivedBy: userProfile?.username || "Authorized Officer",
      branch: "MAIN"
    });
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto bg-slate-950/60 border border-slate-900 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl overflow-hidden mt-4">
      <div className="absolute top-0 right-0 -z-10 h-32 w-32 bg-teal-500/10 blur-2xl rounded-full" />
      <div className="absolute bottom-0 left-0 -z-10 h-32 w-32 bg-indigo-500/10 blur-2xl rounded-full" />
      <div className="border-b border-slate-900 pb-4 mb-6 text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-teal-200 to-indigo-200 bg-clip-text text-transparent flex items-center justify-center gap-3">
          <i className="fas fa-hand-holding-usd text-teal-400"></i>COURSE PAYMENT
        </h1>
        <p className="text-xs text-slate-500 mt-1">Configure student payment plan and record installment checks</p>
      </div>
      {successMsg && (<div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2"><i className="fas fa-check-circle"></i><span>{successMsg}</span></div>)}
      {errorMsg && (<div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2"><i className="fas fa-exclamation-circle"></i><span>{errorMsg}</span></div>)}
      {loading && (<div className="py-10 flex flex-col items-center justify-center gap-2"><i className="fas fa-spinner fa-spin text-teal-400 text-2xl"></i><span className="text-xs text-slate-500">Processing collection...</span></div>)}
      <div className="bg-slate-950/40 p-4 border border-slate-900 rounded-2xl mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="md:col-span-2 space-y-1">
          <label className="block text-xs font-semibold text-slate-400">Search Enrollment ID</label>
          <div className="flex gap-2">
            <input type="text" value={enrollmentId} onChange={(e) => setEnrollmentId(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 placeholder-slate-700 focus:outline-none focus:border-teal-500/50 transition-colors"
              placeholder="e.g. ST001" disabled={locked} />
            {!locked && (<button type="button" onClick={handleEnrollmentSearch}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-850 rounded-xl text-xs font-bold text-slate-200 transition-all active:scale-95">Search</button>)}
          </div>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-400">Student Name</label>
          <input type="text" value={studentName} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-400 cursor-not-allowed" readOnly />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-400">Receipt No</label>
          <input type="text" value={receiptNo} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-400 cursor-not-allowed" readOnly />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-900/20 border border-slate-900 p-4 rounded-2xl flex flex-col justify-center">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Trainee Course</span>
          <span className="text-sm font-bold text-slate-300 capitalize mt-1">{courseName ? courseName.replace("_", " ") : "Not selected"}</span>
        </div>
        <div className="bg-slate-900/20 border border-slate-900 p-4 rounded-2xl flex flex-col justify-center">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tenure / Duration</span>
          <span className="text-sm font-bold text-slate-300 mt-1">{config.duration || "-"}</span>
        </div>
        <div className="bg-slate-900/20 border border-slate-900 p-4 rounded-2xl flex flex-col justify-center">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Payable Course Fee</span>
          <span className="text-sm font-extrabold text-teal-400 mt-1">₹{totalFees.toLocaleString()}</span>
        </div>
      </div>
      {/* Payment Options - simplified but keep same structure */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider border-l-2 border-teal-500 pl-2">Select Payment Plan</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(!locked || paymentType === "full") && (
            <div onClick={() => !locked && setPaymentType("full")}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${paymentType === "full" ? "bg-teal-500/5 border-teal-500/40 shadow-lg shadow-teal-500/5" : "bg-slate-950/30 border-slate-900 hover:border-slate-800"}`}>
              <div className="flex items-center gap-2.5 mb-2">
                <input type="radio" id="full" name="plan" checked={paymentType === "full"} onChange={() => !locked && setPaymentType("full")} disabled={locked} className="h-4.5 w-4.5 text-teal-500 border-slate-800 bg-slate-950 focus:ring-teal-500/20 focus:ring-offset-slate-950" />
                <label htmlFor="full" className="font-bold text-sm text-slate-200 cursor-pointer">Full Payment</label>
              </div>
              <p className="text-xs text-slate-500">Pay the entire amount upfront</p>
              <div className="mt-4 pt-3 border-t border-slate-900 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400"><span>Standard Fees:</span><span>₹{totalFees.toLocaleString()}</span></div>
                <div className="flex justify-between items-center text-slate-400"><span>Discount (₹):</span>
                  <input type="number" value={discountRupees || ""} onChange={(e) => setDiscountRupees(Math.min(totalFees, Math.max(0, parseInt(e.target.value) || 0)))} disabled={locked} className="w-20 bg-slate-950 border border-slate-850 rounded-lg px-2 py-1 text-right text-slate-200 text-xs font-semibold focus:outline-none focus:border-teal-500/40" placeholder="0" />
                </div>
                <div className="flex justify-between text-slate-400"><span>Discount (%):</span><span>{fullDiscountPercent}%</span></div>
                <div className="flex justify-between font-bold text-slate-200 border-t border-slate-900 pt-2 mt-1"><span>Total Payable:</span><span className="text-teal-400">₹{fullTotalPayable.toLocaleString()}</span></div>
              </div>
            </div>
          )}
          {(!locked || paymentType === "partial") && (
            <div onClick={() => !locked && setPaymentType("partial")}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${paymentType === "partial" ? "bg-teal-500/5 border-teal-500/40 shadow-lg shadow-teal-500/5" : "bg-slate-950/30 border-slate-900 hover:border-slate-800"}`}>
              <div className="flex items-center gap-2.5 mb-2">
                <input type="radio" id="partial" name="plan" checked={paymentType === "partial"} onChange={() => !locked && setPaymentType("partial")} disabled={locked} className="h-4.5 w-4.5 text-teal-500 border-slate-800 bg-slate-950 focus:ring-teal-500/20 focus:ring-offset-slate-950" />
                <label htmlFor="partial" className="font-bold text-sm text-slate-200 cursor-pointer">Partial Payment</label>
              </div>
              <p className="text-xs text-slate-500">Pay initial and the rest in installments</p>
              <div className="mt-4 pt-3 border-t border-slate-900 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-400"><span>Initial Pay (₹):</span>
                  <input type="number" value={partialInitial || ""} onChange={(e) => setPartialInitial(Math.min(partialDiscountedTotal, Math.max(0, parseInt(e.target.value) || 0)))} disabled={locked} className="w-20 bg-slate-950 border border-slate-850 rounded-lg px-2 py-1 text-right text-slate-200 text-xs font-semibold focus:outline-none focus:border-teal-500/40" placeholder="0" />
                </div>
                <div className="flex justify-between items-center text-slate-400"><span>Discount (₹):</span>
                  <input type="number" value={discountRupees || ""} onChange={(e) => setDiscountRupees(Math.min(totalFees, Math.max(0, parseInt(e.target.value) || 0)))} disabled={locked} className="w-20 bg-slate-950 border border-slate-850 rounded-lg px-2 py-1 text-right text-slate-200 text-xs font-semibold focus:outline-none focus:border-teal-500/40" placeholder="0" />
                </div>
                <div className="flex justify-between items-center text-slate-400"><span>Installments:</span>
                  <select value={partialTenure} onChange={(e) => setPartialTenure(parseInt(e.target.value))} disabled={locked} className="bg-slate-950 border border-slate-850 rounded-lg px-2 py-1 text-slate-200 text-xs font-semibold focus:outline-none">
                    {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="flex justify-between text-slate-400"><span>EMI Amount:</span><span>₹{partialEMIAmount.toLocaleString()}</span></div>
                <div className="flex justify-between font-bold text-slate-200 border-t border-slate-900 pt-2 mt-1"><span>Total Payable:</span><span className="text-teal-400">₹{partialTotalPayable.toLocaleString()}</span></div>
              </div>
            </div>
          )}
          {(!locked || paymentType === "emi") && (
            <div onClick={() => !locked && setPaymentType("emi")}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${paymentType === "emi" ? "bg-teal-500/5 border-teal-500/40 shadow-lg shadow-teal-500/5" : "bg-slate-950/30 border-slate-900 hover:border-slate-800"}`}>
              <div className="flex items-center gap-2.5 mb-2">
                <input type="radio" id="emi" name="plan" checked={paymentType === "emi"} onChange={() => !locked && setPaymentType("emi")} disabled={locked} className="h-4.5 w-4.5 text-teal-500 border-slate-800 bg-slate-950 focus:ring-teal-500/20 focus:ring-offset-slate-950" />
                <label htmlFor="emi" className="font-bold text-sm text-slate-200 cursor-pointer">EMI Plan</label>
              </div>
              <p className="text-xs text-slate-500">Pay in easy monthly installments</p>
              <div className="mt-4 pt-3 border-t border-slate-900 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-400"><span>Down Pay (₹):</span>
                  <input type="number" value={emiDownPayment || ""} onChange={(e) => setEmiDownPayment(Math.min(emiDiscountedTotal, Math.max(0, parseInt(e.target.value) || 0)))} disabled={locked} className="w-20 bg-slate-950 border border-slate-850 rounded-lg px-2 py-1 text-right text-slate-200 text-xs font-semibold focus:outline-none focus:border-teal-500/40" placeholder="0" />
                </div>
                <div className="flex justify-between items-center text-slate-400"><span>Discount (₹):</span>
                  <input type="number" value={discountRupees || ""} onChange={(e) => setDiscountRupees(Math.min(totalFees, Math.max(0, parseInt(e.target.value) || 0)))} disabled={locked} className="w-20 bg-slate-950 border border-slate-850 rounded-lg px-2 py-1 text-right text-slate-200 text-xs font-semibold focus:outline-none focus:border-teal-500/40" placeholder="0" />
                </div>
                <div className="flex justify-between items-center text-slate-400"><span>Tenure (Months):</span>
                  <select value={emiTenure} onChange={(e) => setEmiTenure(parseInt(e.target.value))} disabled={locked} className="bg-slate-950 border border-slate-850 rounded-lg px-2 py-1 text-slate-200 text-xs font-semibold focus:outline-none">
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12, 18, 24, 36].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="flex justify-between text-slate-400"><span>EMI Amount:</span><span>₹{emiEMIAmount.toLocaleString()}</span></div>
                <div className="flex justify-between font-bold text-slate-200 border-t border-slate-900 pt-2 mt-1"><span>Total Payable:</span><span className="text-teal-400">₹{emiTotalPayable.toLocaleString()}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="mt-6 space-y-2">
        <label htmlFor="payMethod" className="block text-xs font-semibold text-slate-400">Payment Method*</label>
        <select id="payMethod" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} disabled={locked}
          className="w-full max-w-xs bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-teal-500/50 transition-colors" required>
          <option value="">Select Method</option>
          <option value="Cash">Cash</option>
          <option value="Bank">Bank Transfer</option>
          <option value="UPI">UPI</option>
          <option value="Cheque">Bank Check / Cheque</option>
        </select>
      </div>
      {!confirmed && (
        <div className="mt-6 p-4 bg-teal-500/5 border border-teal-500/10 rounded-2xl">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" id="confirmLock" onChange={handleConfirmPlan} className="h-5 w-5 text-teal-500 border-slate-800 bg-slate-950 rounded focus:ring-teal-500/30 focus:ring-offset-slate-950" />
            <span className="text-xs font-semibold text-slate-300">I confirm my payment option selection and agree to proceed with the payment plan.</span>
          </label>
          <p className="mt-1 text-[10px] text-slate-500 ml-8">Checking this box will lock your payment selection and generate the installment schedule.</p>
        </div>
      )}
      {confirmed && schedule.length > 0 && (
        <div className="mt-8 space-y-4">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider border-l-2 border-teal-500 pl-2">Installment Schedule</h3>
          <div className="overflow-x-auto bg-slate-950/20 border border-slate-900 rounded-2xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950/50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-900">
                <tr><th className="px-5 py-3 text-center">Installment</th><th className="px-5 py-3 text-center">Due Date</th><th className="px-5 py-3 text-center">Amount</th><th className="px-5 py-3 text-center">Status</th><th className="px-5 py-3 text-center">Mark as Paid</th><th className="px-5 py-3 text-center">Receipt</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60">
                {schedule.map((inst) => (
                  <tr key={inst.installmentNumber} className="hover:bg-slate-900/20">
                    <td className="px-5 py-3 text-center font-medium text-slate-300">Installment {inst.installmentNumber}</td>
                    <td className="px-5 py-3 text-center text-slate-400">{inst.dueDate}</td>
                    <td className="px-5 py-3 text-center font-bold text-slate-300">₹{inst.amount.toLocaleString()}</td>
                    <td className="px-5 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${inst.status === "Paid" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>{inst.status}</span></td>
                    <td className="px-5 py-3 text-center"><input type="checkbox" checked={inst.status === "Paid"} disabled={inst.status === "Paid" || processingPayment === inst.installmentNumber} onChange={() => handleMarkAsPaid(inst)} className="h-4.5 w-4.5 text-teal-500 border-slate-800 bg-slate-950 rounded focus:ring-teal-500/30" /></td>
                    <td className="px-5 py-3 text-center">{inst.status === "Paid" ? (<button onClick={() => handlePrintReceipt(inst)} className="px-2 py-1 text-[10px] font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-colors rounded-lg flex items-center justify-center gap-1 mx-auto shadow shadow-emerald-500/10"><i className="fas fa-print"></i>Receipt</button>) : (<span className="text-slate-600">-</span>)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div className="border-t border-slate-900 pt-6 mt-8 flex justify-between items-center">
        <button onClick={onGoBack} className="px-6 py-2.5 text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 rounded-xl transition-all">Back</button>
        {confirmed && (<button onClick={() => onProceedToReceipt(receiptNo, enrollmentId)} className="px-6 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-teal-400 to-indigo-400 hover:opacity-90 transition-all rounded-xl shadow-lg shadow-teal-500/10">Proceed to Admission Receipt</button>)}
      </div>
      {printReceiptData && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl relative">
            <button onClick={() => setPrintReceiptData(null)} className="no-print absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-rose-500/10 text-slate-600 hover:text-rose-600 transition-colors flex items-center justify-center"><i className="fas fa-times"></i></button>
            <div id="receipt-print-area" className="p-4 border-2 border-slate-900 rounded-2xl space-y-4">
              <div className="text-center pb-2 border-b border-slate-300">
                <img src="https://i.postimg.cc/DZFDcqP8/IMG-20250320-WA0023-1-modified-3.png" alt="Institute Logo" className="w-16 h-16 object-contain mx-auto mb-2 rounded-lg" />
                <h2 className="text-lg font-bold uppercase tracking-wider text-slate-800">Shelar Training Institute</h2>
                <p className="text-[9px] text-slate-500 uppercase tracking-widest">{printReceiptData.branch}</p>
              </div>
              <div className="flex justify-between text-xs">
                <div><span className="font-semibold text-slate-500">Receipt No: </span><span className="font-bold text-slate-800">{printReceiptData.receiptNumber}</span></div>
                <div><span className="font-semibold text-slate-500">Date: </span><span className="font-bold text-slate-800">{printReceiptData.date}</span></div>
              </div>
              <div className="space-y-2 text-xs border-y border-slate-200 py-3">
                <div className="flex justify-between"><span className="font-semibold text-slate-500">Student Name:</span><span className="font-bold text-slate-800">{printReceiptData.studentName}</span></div>
                <div className="flex justify-between"><span className="font-semibold text-slate-500">Course Name:</span><span className="font-bold text-slate-800">{printReceiptData.courseName}</span></div>
                <div className="flex justify-between"><span className="font-semibold text-slate-500">Payment Option:</span><span className="font-bold text-slate-800">Installment {printReceiptData.installmentNumber}</span></div>
                <div className="flex justify-between"><span className="font-semibold text-slate-500">Payment Method:</span><span className="font-bold text-slate-800">{printReceiptData.paymentMode}</span></div>
              </div>
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100"><span className="text-xs font-bold text-slate-600">Amount Paid:</span><span className="text-base font-extrabold text-teal-600">₹{printReceiptData.amountPaid.toLocaleString()}</span></div>
              <div className="pt-4 flex justify-between items-end text-[9px] text-slate-500">
                <div><p className="font-bold text-slate-600">Received By:</p><p className="mt-1">{printReceiptData.receivedBy}</p></div>
                <div className="text-right"><div className="h-8 w-24 border-b border-slate-300 mb-1 mx-auto"></div><p className="font-bold text-slate-600">Authorized Signature</p></div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3 no-print">
              <button onClick={() => setPrintReceiptData(null)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all">Close</button>
              <button onClick={() => window.print()} className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl flex items-center gap-1.5 shadow"><i className="fas fa-print"></i>Print Receipt</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}