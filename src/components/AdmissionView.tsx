import React, { useState, useEffect } from "react";
import { UserProfile } from "../lib/services/authService";
import { InquiryData } from "../lib/services/inquiryService";
import {
  getNextReceiptNumber,
  saveAdmissionData,
  AdmissionData
} from "../lib/services/admissionService";
import { getCourse, getAllCourses, Course } from "../lib/services/courseService";
import { db } from "../lib/firebase";
import { collection, getDocs } from "firebase/firestore";

interface AdmissionViewProps {
  userProfile: UserProfile | null;
  inquiryData: InquiryData | null;
  onGoBack: () => void;
  onAdmissionComplete: (enrollmentId: string, studentName: string, courseName: string, totalFees: number, branch: string, receiptNo: string) => void;
}

export default function AdmissionView({
  userProfile,
  inquiryData,
  onGoBack,
  onAdmissionComplete
}: AdmissionViewProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState("");
  const [enrollmentId, setEnrollmentId] = useState("");

  // Photo state
  const [photoFile, setPhotoFile] = useState<File | undefined>(undefined);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Form inputs
  const [guardianRelation, setGuardianRelation] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [agree, setAgree] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const branch = inquiryData?.branch || userProfile?.branch || "kurla";
  const course = inquiryData?.interestedCourse || "";
  const [config, setConfig] = useState({ duration: "1 Year", fees: 30000, admission_fee: 5000 });

  // Fetch course configuration dynamically from Firestore
  useEffect(() => {
    async function loadCourseConfig() {
      if (!course) return;
      try {
        const courseData = await getCourse(course);
        if (courseData && courseData.active !== false) {
          setConfig({
            duration: courseData.duration,
            fees: courseData.fees,
            admission_fee: courseData.admissionFee || 0
          });
        } else {
          // Fallback: try searching all courses
          const allCourses = await getAllCourses();
          const found = allCourses.find(c => c.courseId === course && c.active !== false);
          if (found) {
            setConfig({
              duration: found.duration,
              fees: found.fees,
              admission_fee: found.admissionFee || 0
            });
          }
        }
      } catch (err) {
        console.warn("Failed to load course config from Firestore, using defaults:", err);
      }
    }
    loadCourseConfig();
  }, [course]);

  // Fetch next receipt number and enrollment ID on mount
  useEffect(() => {
    async function initIds() {
      setLoading(true);
      try {
        const nextReceipt = await getNextReceiptNumber();
        setReceiptNumber(nextReceipt);
        const admissionsSnapshot = await getDocs(collection(db, "admissions"));
        let maxNum = 0;
        admissionsSnapshot.forEach((docSnap) => {
          const id = docSnap.id;
          const match = id.match(/^ST(\d+)$/i);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        });
        const nextEnrollment = "ST" + String(maxNum + 1).padStart(3, "0");
        setEnrollmentId(nextEnrollment);
      } catch (err) {
        console.error("Error loading IDs:", err);
      } finally {
        setLoading(false);
      }
    }
    initIds();
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agree) {
      setErrorMsg("Please agree to the terms and conditions.");
      return;
    }
    if (!paymentMode) {
      setErrorMsg("Please select a payment mode.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    const firstName = inquiryData?.firstName || "";
    const middleName = inquiryData?.middleName || "";
    const lastName = inquiryData?.lastName || "";
    const studentName = inquiryData?.fullName || [firstName, middleName, lastName].filter(Boolean).join(" ");

    const admissionDoc: AdmissionData = {
      receiptNumber,
      enrollmentId,
      firstName,
      middleName,
      lastName,
      studentName,
      courseName: course,
      courseDuration: config.duration,
      totalCourseFees: config.fees,
      admissionFee: config.admission_fee,
      paymentMode,
      guardianRelation,
      guardianName,
      agreement: agree ? "Agreed" : "Not Agreed",
      user: userProfile?.username || "Admin",
      date: new Date().toISOString().split("T")[0],
      branch
    };

    const res = await saveAdmissionData(admissionDoc, photoFile);
    setSubmitting(false);

    if (res.success) {
      onAdmissionComplete(
        enrollmentId,
        studentName,
        course,
        config.fees,
        branch,
        receiptNumber
      );
    } else {
      setErrorMsg(res.message);
    }
  };

  if (!inquiryData) {
    return (
      <div className="w-full max-w-md mx-auto text-center p-8 bg-slate-950/60 border border-slate-900 rounded-3xl backdrop-blur-xl mt-8">
        <i className="fas fa-exclamation-triangle text-rose-500 text-3xl mb-4"></i>
        <h3 className="text-lg font-bold text-slate-200">No Inquiry Selected</h3>
        <p className="text-sm text-slate-500 mt-2">Please search or submit an inquiry first, then click "Take Admission".</p>
        <button
          onClick={onGoBack}
          className="mt-6 px-5 py-2.5 bg-slate-900 text-slate-300 hover:bg-slate-800 rounded-xl transition-all font-semibold text-xs border border-slate-800"
        >
          Go back to New Inquiry
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-4xl mx-auto bg-slate-950/60 border border-slate-900 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl overflow-hidden mt-4">
      {/* Glow Effects */}
      <div className="absolute top-0 right-0 -z-10 h-32 w-32 bg-teal-500/10 blur-2xl rounded-full" />
      <div className="absolute bottom-0 left-0 -z-10 h-32 w-32 bg-indigo-500/10 blur-2xl rounded-full" />

      {/* Header */}
      <div className="border-b border-slate-900 pb-4 mb-6 text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-teal-200 to-indigo-200 bg-clip-text text-transparent flex items-center justify-center gap-3">
          <i className="fas fa-file-alt text-teal-400"></i>ADMISSION FORM
        </h1>
        <p className="text-xs text-slate-500 mt-1">Complete admission registration for selected trainee</p>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <i className="fas fa-circle-notch fa-spin text-teal-400 text-3xl"></i>
          <span className="text-xs text-slate-500">Generating ID & Receipt codes...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
              <i className="fas fa-exclamation-circle"></i>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Receipt Info */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider border-l-2 border-teal-500 pl-2">Receipt Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-400">Receipt Number</label>
                <input
                  type="text"
                  value={receiptNumber}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed font-medium"
                  readOnly
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-400">Enrollment ID</label>
                <input
                  type="text"
                  value={enrollmentId}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed font-medium tracking-wide"
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* Student Info */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider border-l-2 border-teal-500 pl-2">Student Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-400">First Name</label>
                <input
                  type="text"
                  value={inquiryData.firstName}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed"
                  readOnly
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-400">Middle Name</label>
                <input
                  type="text"
                  value={inquiryData.middleName || ""}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed"
                  readOnly
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-400">Last Name</label>
                <input
                  type="text"
                  value={inquiryData.lastName}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed"
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* Photo Upload */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider border-l-2 border-teal-500 pl-2">Photo Upload</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div className="space-y-1">
                <label htmlFor="student_photo" className="block text-xs font-semibold text-slate-400">
                  Select Profile Photo
                </label>
                <input
                  type="file"
                  id="student_photo"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-500/10 file:text-teal-400 hover:file:bg-teal-500/20 file:cursor-pointer transition-colors"
                />
              </div>
              <div className="flex items-center justify-center min-h-[140px] border-2 border-dashed border-slate-900 rounded-2xl p-2 bg-slate-950/40">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Student Preview"
                    className="max-h-32 object-contain rounded-xl shadow-md border border-slate-900"
                  />
                ) : (
                  <span className="text-xs text-slate-600 font-medium">No Photo Selected</span>
                )}
              </div>
            </div>
          </div>

          {/* Course Details */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider border-l-2 border-teal-500 pl-2">Course Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-400">Course Selected</label>
                <input
                  type="text"
                  value={course.replace("_", " ").toUpperCase()}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed font-medium capitalize"
                  readOnly
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-400">Course Duration</label>
                <input
                  type="text"
                  value={config.duration}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed font-medium"
                  readOnly
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-400">Total Course Fees</label>
                <input
                  type="text"
                  value={`₹${config.fees.toLocaleString()}`}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-teal-400 cursor-not-allowed font-bold"
                  readOnly
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-400">Admission Fee</label>
                <input
                  type="text"
                  value={`₹${config.admission_fee.toLocaleString()}`}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-indigo-400 cursor-not-allowed font-bold"
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider border-l-2 border-teal-500 pl-2">Payment Details</h2>
            <div className="space-y-1">
              <label htmlFor="payment_mode" className="block text-xs font-semibold text-slate-400">Admission Payment Mode*</label>
              <select
                id="payment_mode"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-teal-500/50 transition-colors"
                required
              >
                <option value="">Select Mode</option>
                <option value="Cash">Cash</option>
                <option value="Bank">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="Cheque">Bank Check / Cheque</option>
              </select>
            </div>
          </div>

          {/* Guardian Info */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider border-l-2 border-teal-500 pl-2">Guardian Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="guardian_relation" className="block text-xs font-semibold text-slate-400">Guardian Relation</label>
                <input
                  type="text"
                  id="guardian_relation"
                  value={guardianRelation}
                  onChange={(e) => setGuardianRelation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 transition-colors"
                  placeholder="e.g. Father, Mother, Spouse"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="guardian_name" className="block text-xs font-semibold text-slate-400">Guardian Full Name</label>
                <input
                  type="text"
                  id="guardian_name"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 transition-colors"
                  placeholder="Enter full name"
                />
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="border-t border-slate-900 pt-6 mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="h-4 w-4 text-teal-500 border-slate-800 bg-slate-950 rounded focus:ring-teal-500/30 focus:ring-offset-slate-950"
                  required
                />
                <span className="ml-2 text-xs text-slate-400">I agree to terms, conditions and admission requirements</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onGoBack}
                className="px-6 py-2.5 text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 rounded-xl transition-all"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-teal-400 to-indigo-400 hover:opacity-90 active:scale-95 transition-all rounded-xl shadow-lg shadow-teal-500/10 flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="fas fa-arrow-right"></i>
                    Next
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
