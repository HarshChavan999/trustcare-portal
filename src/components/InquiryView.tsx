import React, { useState, useEffect } from "react";
import { UserProfile } from "../lib/services/authService";
import { 
  checkAadharNumberInquiry, 
  submitInquiryData, 
  InquiryData 
} from "../lib/services/inquiryService";

interface InquiryViewProps {
  userProfile: UserProfile | null;
  onTakeAdmission: (data: InquiryData) => void;
}

export default function InquiryView({ userProfile, onTakeAdmission }: InquiryViewProps) {
  const initialFormState: InquiryData = {
    date: new Date().toISOString().split("T")[0],
    aadharNumber: "",
    firstName: "",
    middleName: "",
    lastName: "",
    qualification: "",
    age: 0,
    gender: "",
    phoneNo: "",
    whatsappNo: "",
    parentsNo: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    addressLine3: "",
    pincode: "",
    interestedCourse: "",
    inquiryTakenBy: userProfile?.username || "",
    branch: userProfile?.branch || "kurla"
  };

  const [formData, setFormData] = useState<InquiryData>(initialFormState);
  const [agree, setAgree] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [aadharFound, setAadharFound] = useState<InquiryData | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Update branch and inquiry taken by when userProfile changes
  useEffect(() => {
    if (userProfile) {
      setFormData(prev => ({
        ...prev,
        branch: userProfile.branch,
        inquiryTakenBy: userProfile.username
      }));
    }
  }, [userProfile]);

  // Aadhaar checking logic
  const handleAadharChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^\d]/g, "").slice(0, 12);
    setFormData(prev => ({ ...prev, aadharNumber: val }));

    if (val.length === 12) {
      setLookupLoading(true);
      try {
        const record = await checkAadharNumberInquiry(val);
        if (record) {
          setAadharFound(record);
          setShowPopup(true);
        }
      } catch (err) {
        console.error("Aadhaar lookup error:", err);
      } finally {
        setLookupLoading(false);
      }
    }
  };

  const fillFormFromPopup = () => {
    if (aadharFound) {
      setFormData({
        ...formData,
        ...aadharFound,
        // Make sure we keep the new date/Aadhaar/takenBy if not in lookup
        date: formData.date,
        aadharNumber: aadharFound.aadharNumber || formData.aadharNumber,
        branch: userProfile?.branch || aadharFound.branch || "kurla"
      });
      setShowPopup(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agree) {
      setErrorMsg("Please agree to the terms and conditions.");
      return;
    }

    setSuccessMsg("");
    setErrorMsg("");

    const res = await submitInquiryData({
      ...formData,
      loggedInUserId: userProfile?.username || "Guest"
    });

    if (res.success) {
      setSuccessMsg(res.message);
      // Reset form (keep branch and taken by)
      setFormData({
        ...initialFormState,
        branch: userProfile?.branch || "kurla",
        inquiryTakenBy: userProfile?.username || ""
      });
      setAgree(false);
      setAadharFound(null);
      // Auto clear success message after 4s
      setTimeout(() => setSuccessMsg(""), 4000);
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleTakeAdmission = () => {
    if (!formData.firstName || !formData.lastName || !formData.interestedCourse) {
      setErrorMsg("Please fill out basic student details (First Name, Last Name, and Course) first.");
      return;
    }
    // Set combined full name before sending
    const fullName = [formData.firstName, formData.middleName, formData.lastName].filter(Boolean).join(" ");
    const address = [formData.addressLine1, formData.addressLine2, formData.addressLine3, `Pincode: ${formData.pincode}`].filter(Boolean).join(", ");
    
    onTakeAdmission({
      ...formData,
      fullName,
      address
    });
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto bg-slate-950/60 border border-slate-900 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl overflow-hidden mt-4">
      {/* Glow Effects */}
      <div className="absolute top-0 right-0 -z-10 h-32 w-32 bg-teal-500/10 blur-2xl rounded-full" />
      <div className="absolute bottom-0 left-0 -z-10 h-32 w-32 bg-indigo-500/10 blur-2xl rounded-full" />

      {/* Header */}
      <div className="border-b border-slate-900 pb-4 mb-6 text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-teal-200 to-indigo-200 bg-clip-text text-transparent flex items-center justify-center gap-3">
          <i className="fas fa-file-signature text-teal-400"></i>INQUIRY FORM
        </h1>
        <p className="text-xs text-slate-500 mt-1">Submit trainee inquiries or lookup existing records via Aadhar</p>
      </div>

      {/* Status Messages */}
      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2 animate-pulse">
          <i className="fas fa-check-circle"></i>
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
          <i className="fas fa-exclamation-circle"></i>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Details Section */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider border-l-2 border-teal-500 pl-2">Personal Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Aadhar Number */}
            <div className="space-y-1">
              <label htmlFor="aadharNumber" className="block text-xs font-semibold text-slate-400">
                Aadhar Number (12 Digits)
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="aadharNumber"
                  value={formData.aadharNumber}
                  onChange={handleAadharChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pr-12 text-sm text-slate-100 placeholder-slate-700 focus:outline-none focus:border-teal-500/50 transition-colors font-medium tracking-wide"
                  placeholder="e.g. 123456789012"
                  maxLength={12}
                  required
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                  {lookupLoading ? (
                    <i className="fas fa-spinner fa-spin text-teal-400"></i>
                  ) : formData.aadharNumber.length === 12 ? (
                    <i className="fas fa-check-circle text-emerald-400"></i>
                  ) : (
                    <i className="fas fa-id-card text-slate-600"></i>
                  )}
                </div>
              </div>
            </div>

            {/* Date */}
            <div className="space-y-1">
              <label htmlFor="date" className="block text-xs font-semibold text-slate-400">
                Inquiry Date
              </label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 transition-colors"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Names */}
            <div className="space-y-1">
              <label htmlFor="firstName" className="block text-xs font-semibold text-slate-400">First Name*</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 transition-colors"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="middleName" className="block text-xs font-semibold text-slate-400">Middle Name</label>
              <input
                type="text"
                id="middleName"
                name="middleName"
                value={formData.middleName}
                onChange={handleInputChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="lastName" className="block text-xs font-semibold text-slate-400">Last Name*</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 transition-colors"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Qualification */}
            <div className="space-y-1">
              <label htmlFor="qualification" className="block text-xs font-semibold text-slate-400">Qualification*</label>
              <input
                type="text"
                id="qualification"
                name="qualification"
                value={formData.qualification}
                onChange={handleInputChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 transition-colors"
                required
              />
            </div>
            {/* Age */}
            <div className="space-y-1">
              <label htmlFor="age" className="block text-xs font-semibold text-slate-400">Age*</label>
              <input
                type="number"
                id="age"
                name="age"
                value={formData.age || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, age: parseInt(e.target.value) || 0 }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 transition-colors"
                required
                min={0}
              />
            </div>
            {/* Gender */}
            <div className="space-y-1">
              <label htmlFor="gender" className="block text-xs font-semibold text-slate-400">Gender*</label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-teal-500/50 transition-colors"
                required
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contact Info Section */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider border-l-2 border-teal-500 pl-2">Contact Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label htmlFor="phoneNo" className="block text-xs font-semibold text-slate-400">Phone*</label>
              <input
                type="tel"
                id="phoneNo"
                name="phoneNo"
                value={formData.phoneNo}
                onChange={(e) => setFormData(prev => ({ ...prev, phoneNo: e.target.value.replace(/[^\d]/g, "").slice(0, 10) }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 transition-colors"
                placeholder="10 digit number"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="whatsappNo" className="block text-xs font-semibold text-slate-400">WhatsApp*</label>
              <input
                type="tel"
                id="whatsappNo"
                name="whatsappNo"
                value={formData.whatsappNo}
                onChange={(e) => setFormData(prev => ({ ...prev, whatsappNo: e.target.value.replace(/[^\d]/g, "").slice(0, 10) }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 transition-colors"
                placeholder="10 digit number"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="parentsNo" className="block text-xs font-semibold text-slate-400">Parents No*</label>
              <input
                type="tel"
                id="parentsNo"
                name="parentsNo"
                value={formData.parentsNo}
                onChange={(e) => setFormData(prev => ({ ...prev, parentsNo: e.target.value.replace(/[^\d]/g, "").slice(0, 10) }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 transition-colors"
                placeholder="10 digit number"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="email" className="block text-xs font-semibold text-slate-400">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 transition-colors"
              placeholder="e.g. email@example.com"
            />
          </div>
        </div>

        {/* Address Section */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider border-l-2 border-teal-500 pl-2">Address Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="addressLine1" className="block text-xs font-semibold text-slate-400">Address Line 1*</label>
              <input
                type="text"
                id="addressLine1"
                name="addressLine1"
                value={formData.addressLine1}
                onChange={handleInputChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 transition-colors"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="addressLine2" className="block text-xs font-semibold text-slate-400">Address Line 2</label>
              <input
                type="text"
                id="addressLine2"
                name="addressLine2"
                value={formData.addressLine2}
                onChange={handleInputChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="addressLine3" className="block text-xs font-semibold text-slate-400">Address Line 3</label>
              <input
                type="text"
                id="addressLine3"
                name="addressLine3"
                value={formData.addressLine3}
                onChange={handleInputChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="pincode" className="block text-xs font-semibold text-slate-400">Pincode*</label>
              <input
                type="text"
                id="pincode"
                name="pincode"
                value={formData.pincode}
                onChange={(e) => setFormData(prev => ({ ...prev, pincode: e.target.value.replace(/[^\d]/g, "").slice(0, 6) }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 transition-colors font-medium tracking-widest"
                placeholder="6 digits"
                required
              />
            </div>
          </div>
        </div>

        {/* Course & Metadata Section */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider border-l-2 border-teal-500 pl-2">Course Selection & Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label htmlFor="interestedCourse" className="block text-xs font-semibold text-slate-400">Select Course*</label>
              <select
                id="interestedCourse"
                name="interestedCourse"
                value={formData.interestedCourse}
                onChange={handleInputChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-teal-500/50 transition-colors"
                required
              >
                <option value="">Select Course</option>
                <option value="anm_nursing">ANM Nursing Diploma Course</option>
                <option value="gnm_nursing">GNM Nursing Diploma Course</option>
                <option value="dmlt">DMLT Diploma Course</option>
                <option value="ot_technician">OT Technician Diploma Course</option>
                <option value="electrician">Electrician Diploma Course</option>
                <option value="ac_refrigerator">AC & Refrigerator Diploma Course</option>
                <option value="basic_parlour">Basic Parlour Course</option>
                <option value="general_nursing">General Nursing and Midwifery Assistant</option>
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="inquiryTakenBy" className="block text-xs font-semibold text-slate-400">Inquiry Taken By</label>
              <input
                type="text"
                id="inquiryTakenBy"
                name="inquiryTakenBy"
                value={formData.inquiryTakenBy}
                onChange={handleInputChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 transition-colors"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="branch" className="block text-xs font-semibold text-slate-400">Branch</label>
              <input
                type="text"
                id="branch"
                name="branch"
                value={formData.branch}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed capitalize"
                readOnly
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-900 pt-6 mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="agree"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="h-4 w-4 text-teal-500 border-slate-800 bg-slate-950 rounded focus:ring-teal-500/30 focus:ring-offset-slate-950"
                required
              />
              <span className="ml-2 text-xs text-slate-400">I agree to the terms and conditions</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 w-full sm:w-auto">
            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-teal-400 to-indigo-400 hover:opacity-90 active:scale-95 transition-all rounded-xl shadow-lg shadow-teal-500/10 flex items-center justify-center gap-2"
            >
              <i className="fas fa-paper-plane"></i>
              Submit Inquiry
            </button>
            <button
              type="button"
              onClick={handleTakeAdmission}
              className="px-6 py-2.5 text-xs font-bold text-slate-200 bg-slate-900 border border-slate-850 hover:bg-slate-800/80 active:scale-95 transition-all rounded-xl flex items-center justify-center gap-2"
            >
              <i className="fas fa-file-alt"></i>
              Take Admission
            </button>
          </div>
        </div>
      </form>

      {/* Aadhaar Record Found Popup Modal */}
      {showPopup && aadharFound && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all duration-300 scale-100">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-900 bg-gradient-to-r from-slate-950 to-slate-900 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-full flex items-center justify-center shadow-inner">
                  <i className="fas fa-search text-sm"></i>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Existing Aadhar Found!</h3>
                  <p className="text-[10px] text-slate-500">Record found in branch: <span className="capitalize text-teal-400">{aadharFound.branch}</span></p>
                </div>
              </div>
              <button 
                onClick={() => setShowPopup(false)}
                className="w-8 h-8 rounded-full bg-slate-900 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors flex items-center justify-center"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 max-h-80 overflow-y-auto">
              <div className="grid grid-cols-2 gap-x-2 gap-y-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Full Name</span>
                  <span className="text-slate-200 font-semibold">{aadharFound.fullName || `${aadharFound.firstName} ${aadharFound.lastName}`}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Phone No</span>
                  <span className="text-slate-200 font-semibold">{aadharFound.phoneNo}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Qualification</span>
                  <span className="text-slate-200 font-semibold">{aadharFound.qualification}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Age / Gender</span>
                  <span className="text-slate-200 font-semibold">{aadharFound.age} / {aadharFound.gender}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block">Interested Course</span>
                  <span className="text-slate-200 font-semibold capitalize">{aadharFound.interestedCourse.replace("_", " ")}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block">Address</span>
                  <span className="text-slate-200 font-medium text-[11px] leading-relaxed">{aadharFound.address || `${aadharFound.addressLine1}, ${aadharFound.pincode}`}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-900 bg-slate-950 flex items-center justify-end gap-3">
              <button
                onClick={() => { setShowPopup(false); setAadharFound(null); }}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 rounded-xl transition-all"
              >
                Continue New
              </button>
              <button
                onClick={fillFormFromPopup}
                className="px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-teal-400 to-indigo-400 hover:opacity-90 rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <i className="fas fa-magic"></i>
                Fill Form data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
