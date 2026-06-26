"use client";

import React, { useState, useEffect } from "react";
import { 
  seedDefaultUsers, 
  loginUser, 
  logoutUser, 
  subscribeToAuth, 
  UserProfile 
} from "../lib/services/authService";
import { InquiryData } from "../lib/services/inquiryService";

// UI Components
import Sidebar from "../components/Sidebar";
import InquiryView from "../components/InquiryView";
import AdmissionView from "../components/AdmissionView";
import PaymentView from "../components/PaymentView";
import ExamReceiptView from "../components/ExamReceiptView";
import AnalyticsView from "../components/AnalyticsView";

export default function Home() {
  const [showLogin, setShowLogin] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Dashboard routing states
  const [activeTab, setActiveTab] = useState("inquiry");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Flow/Context states
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryData | null>(null);
  
  const [paymentContext, setPaymentContext] = useState<{
    enrollmentId: string | null;
    studentName: string | null;
    courseName: string | null;
    totalFees: number | null;
    receiptNo: string | null;
  }>({
    enrollmentId: null,
    studentName: null,
    courseName: null,
    totalFees: null,
    receiptNo: null
  });

  // Login form inputs
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Seed default users and listen to auth changes on mount
  useEffect(() => {
    async function init() {
      // Seed users in background
      await seedDefaultUsers();
      
      // Subscribe to Firebase auth updates
      const unsubscribe = subscribeToAuth((user, profile) => {
        setUserProfile(profile);
        setAuthLoading(false);
      });
      
      return () => unsubscribe();
    }
    init();
  }, []);

  // Handle Sign In submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim() || !passwordInput) {
      setLoginError("Please enter both username and password.");
      return;
    }

    setLoginLoading(true);
    setLoginError("");
    try {
      const profile = await loginUser(usernameInput.trim(), passwordInput);
      setUserProfile(profile);
      setShowLogin(false);
      setUsernameInput("");
      setPasswordInput("");
      setActiveTab("inquiry"); // Default starting tab
    } catch (error: any) {
      console.error("Login failure:", error);
      setLoginError(error.message || "Invalid username or password.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setUserProfile(null);
      setSelectedInquiry(null);
      setPaymentContext({
        enrollmentId: null,
        studentName: null,
        courseName: null,
        totalFees: null,
        receiptNo: null
      });
    } catch (error) {
      console.error("Logout failure:", error);
    }
  };

  // Navigations between tabs mapping dataflow
  const handleTakeAdmission = (inquiry: InquiryData) => {
    setSelectedInquiry(inquiry);
    setActiveTab("admission");
  };

  const handleAdmissionComplete = (
    enrollmentId: string,
    studentName: string,
    courseName: string,
    totalFees: number,
    branch: string,
    receiptNo: string
  ) => {
    setPaymentContext({
      enrollmentId,
      studentName,
      courseName,
      totalFees,
      receiptNo
    });
    setActiveTab("payment");
  };

  const handleCoursePaymentRedirect = (
    enrollmentId: string,
    studentName: string,
    courseName: string,
    totalFees: number,
    branch: string
  ) => {
    setPaymentContext({
      enrollmentId,
      studentName,
      courseName,
      totalFees,
      receiptNo: ""
    });
    setActiveTab("payment");
  };

  const handleGoBackFromAdmission = () => {
    setSelectedInquiry(null);
    setActiveTab("inquiry");
  };

  const handleGoBackFromPayment = () => {
    setPaymentContext({
      enrollmentId: null,
      studentName: null,
      courseName: null,
      totalFees: null,
      receiptNo: null
    });
    setActiveTab("admission");
  };

  const handleProceedToReceipt = (receiptNo: string, enrollmentId: string) => {
    // Navigate student back to inquiry form/dash after completion
    alert(`Payment configuration logged successfully! Student ID: ${enrollmentId}`);
    setActiveTab("inquiry");
  };

  const handleSearchStudentId = (id: string) => {
    setPaymentContext({
      enrollmentId: id,
      studentName: "",
      courseName: "",
      totalFees: null,
      receiptNo: ""
    });
    setActiveTab("payment");
  };

  // Sidebar elements definition for mobile fallback renderer
  const navItems = [
    { id: "inquiry", label: "New Inquiry", icon: "fa-file-signature" },
    { id: "admission", label: "New Admission", icon: "fa-user-plus" },
    { id: "payment", label: "Course Payment", icon: "fa-hand-holding-usd" },
    { id: "exam-receipt", label: "Exam Receipt", icon: "fa-receipt" }
  ];

  const analyticsItems = [
    { id: "fee-structure", label: "Fees Structure", icon: "fa-university" },
    { id: "admission-analytics", label: "Admission Structure", icon: "fa-chart-line" },
    { id: "inquiry-analytics", label: "Inquiry Structure", icon: "fa-chart-bar" },
    { id: "due-fees", label: "Due Fees", icon: "fa-clock" }
  ];

  // Auth Loading Screen
  if (authLoading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-950 text-slate-100 gap-3">
        <i className="fas fa-circle-notch fa-spin text-teal-400 text-4xl"></i>
        <span className="text-sm font-semibold tracking-wider text-slate-400">Loading TrustCare Portal...</span>
      </div>
    );
  }

  // DASHBOARD VIEW (Logged In)
  if (userProfile) {
    return (
      <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
        
        {/* Sidebar Container */}
        <Sidebar
          userProfile={userProfile}
          activeTab={activeTab}
          setActiveTab={(tab) => { setActiveTab(tab); setMobileMenuOpen(false); }}
          onLogout={handleLogout}
          onSearchStudentId={handleSearchStudentId}
        />

        {/* Dashboard Main Workspace */}
        <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
          
          {/* Mobile responsive navigation header */}
          <header className="md:hidden flex items-center justify-between px-6 py-4 bg-slate-950/80 border-b border-slate-900 sticky top-0 z-20 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-teal-400 to-indigo-500 shadow-md">
                <svg className="h-5 w-5 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944" />
                </svg>
              </div>
              <span className="font-extrabold text-sm tracking-tight bg-gradient-to-r from-teal-200 to-indigo-200 bg-clip-text text-transparent">TrustCare</span>
            </div>
            
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-400 hover:text-white p-2 rounded-lg border border-slate-900 bg-slate-900/30"
            >
              <i className={`fas ${mobileMenuOpen ? "fa-times" : "fa-bars"} text-base`}></i>
            </button>
          </header>

          {/* Mobile Navigation Dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-slate-950/95 border-b border-slate-900 py-4 px-6 flex flex-col gap-2 sticky top-[65px] z-20 backdrop-blur-md animate-slide-up">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Navigation</p>
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-xs font-semibold rounded-xl transition-colors flex items-center gap-2.5 ${
                    activeTab === item.id 
                      ? "bg-teal-500/10 text-teal-400 border border-teal-500/20" 
                      : "text-slate-400 hover:bg-slate-900/50"
                  }`}
                >
                  <i className={`fas ${item.icon} text-sm`}></i>
                  <span>{item.label}</span>
                </button>
              ))}

              {userProfile.role === "admin" && (
                <>
                  <div className="border-t border-slate-900 my-2 pt-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Analytics Dashboard</div>
                  {analyticsItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-semibold rounded-xl transition-colors flex items-center gap-2.5 ${
                        activeTab === item.id 
                          ? "bg-teal-500/10 text-teal-400 border border-teal-500/20" 
                          : "text-slate-400 hover:bg-slate-900/50"
                      }`}
                    >
                      <i className={`fas ${item.icon} text-sm`}></i>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </>
              )}
              
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-xs font-semibold rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-2.5 border-t border-slate-900/60 mt-2 pt-3"
              >
                <i className="fas fa-sign-out-alt text-sm"></i>
                <span>Logout</span>
              </button>
            </div>
          )}

          {/* Tab Views Panel */}
          <main className="flex-1 p-4 sm:p-6 md:p-8">
            {activeTab === "inquiry" && (
              <InquiryView
                userProfile={userProfile}
                onTakeAdmission={handleTakeAdmission}
              />
            )}

            {activeTab === "admission" && (
              <AdmissionView
                userProfile={userProfile}
                inquiryData={selectedInquiry}
                onGoBack={handleGoBackFromAdmission}
                onAdmissionComplete={handleAdmissionComplete}
              />
            )}

            {activeTab === "payment" && (
              <PaymentView
                userProfile={userProfile}
                initialEnrollmentId={paymentContext.enrollmentId}
                initialStudentName={paymentContext.studentName}
                initialCourseName={paymentContext.courseName}
                initialTotalFees={paymentContext.totalFees}
                initialReceiptNo={paymentContext.receiptNo}
                onGoBack={handleGoBackFromPayment}
                onProceedToReceipt={handleProceedToReceipt}
              />
            )}

            {activeTab === "exam-receipt" && (
              <ExamReceiptView
                userProfile={userProfile}
                onGoBack={() => setActiveTab("inquiry")}
              />
            )}

            {/* Admin Analytics Tab routers */}
            {["fee-structure", "admission-analytics", "inquiry-analytics", "due-fees"].includes(activeTab) && (
              <AnalyticsView
                userProfile={userProfile}
                activeTab={activeTab}
                onTakeAdmission={handleTakeAdmission}
                onCoursePayment={handleCoursePaymentRedirect}
              />
            )}
          </main>

        </div>
      </div>
    );
  }

  // PUBLIC LANDING PAGE (Logged Out)
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      
      {/* Glow Backdrops */}
      <div className="absolute top-0 left-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-teal-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-[600px] w-[600px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />

      {/* Header/Navbar */}
      <header className="sticky top-0 z-40 backdrop-blur-md border-b border-slate-900 bg-slate-950/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-400 to-indigo-500 shadow-lg shadow-teal-500/20">
                <svg className="h-6 w-6 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9" />
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-teal-200 to-indigo-200 bg-clip-text text-transparent">
                TrustCare
              </span>
              <span className="rounded-full bg-teal-500/10 px-2.5 py-0.5 text-xs font-semibold text-teal-400 border border-teal-500/20">
                Portal
              </span>
            </div>

            <nav className="hidden md:flex gap-8 text-sm font-medium text-slate-400">
              <a href="#features" className="hover:text-teal-400 transition-colors">Features</a>
              <a href="#dashboard" className="hover:text-teal-400 transition-colors">Platform</a>
              <a href="#security" className="hover:text-teal-400 transition-colors">Security</a>
              <a href="#support" className="hover:text-teal-400 transition-colors">Support</a>
            </nav>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowLogin(true)}
                className="text-sm font-medium text-slate-300 hover:text-teal-400 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => setShowLogin(true)}
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-teal-400 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:opacity-95 active:scale-98 transition-all shadow-md shadow-teal-400/10 hover:shadow-teal-400/20"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <section className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-8 items-center">
          <div className="lg:col-span-7 flex flex-col justify-center text-center lg:text-left">
            <div className="inline-flex self-center lg:self-start items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/5 px-4 py-1.5 text-xs font-medium text-teal-300 mb-6">
              <span className="flex h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
              Empowering Your Health Journey
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl bg-gradient-to-r from-white via-teal-100 to-indigo-200 bg-clip-text text-transparent">
              Your Health. <br className="hidden sm:inline" />
              Connected. Protected.
            </h1>
            <p className="mt-6 text-lg text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Experience the next generation of healthcare management. Securely access clinical records, message your care team instantly, and schedule telehealth visits on a certified, secure portal.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <button
                onClick={() => setShowLogin(true)}
                className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl bg-teal-400 px-8 py-4 text-base font-bold text-slate-950 hover:bg-teal-300 transition-colors shadow-lg shadow-teal-400/20 active:scale-98"
              >
                Launch Dashboard
              </button>
              <a
                href="#features"
                className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900 hover:border-slate-700 px-8 py-4 text-base font-semibold text-slate-200 transition-all"
              >
                Learn More
              </a>
            </div>

            <div className="mt-12 grid grid-cols-3 gap-6 border-t border-slate-900 pt-8 max-w-lg mx-auto lg:mx-0">
              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-teal-400">99.9%</p>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">Uptime SLA</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-indigo-400">256-bit</p>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">E2E Encryption</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-teal-400">HIPAA</p>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">Fully Compliant</p>
              </div>
            </div>
          </div>

          {/* Right Card Mockup */}
          <div id="dashboard" className="lg:col-span-5 relative mt-8 lg:mt-0">
            <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-teal-400 to-indigo-500 opacity-20 blur-lg" />
            <div className="relative rounded-2xl border border-slate-800/80 bg-slate-950/80 p-6 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-slate-900 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-900 flex items-center justify-center text-teal-400 font-semibold border border-slate-800">
                    JD
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">John Doe</h3>
                    <p className="text-xs text-slate-500">Patient ID: #TC-88219</p>
                  </div>
                </div>
                <div className="rounded-full bg-teal-500/10 px-2.5 py-1 text-xs font-semibold text-teal-400 border border-teal-500/20">
                  Active Vitals
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="rounded-xl border border-slate-900 bg-slate-900/30 p-4">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-medium">Heart Rate</span>
                    <i className="fas fa-heart text-rose-500 text-sm"></i>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-slate-200">72</span>
                    <span className="text-xs text-slate-500">bpm</span>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-900 bg-slate-900/30 p-4">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-medium">SpO2</span>
                    <i className="fas fa-bolt text-teal-400 text-sm"></i>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-slate-200">98</span>
                    <span className="text-xs text-slate-500">%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Upcoming Appointments</div>
                <div className="flex items-center justify-between rounded-xl border border-slate-900 bg-slate-900/50 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 animate-pulse">
                      <i className="fas fa-calendar-alt"></i>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200">Dr. Sarah Jenkins</h4>
                      <p className="text-[10px] text-slate-500">Cardiology Consultation</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-teal-400 block">June 18</span>
                    <span className="text-[10px] text-slate-500 block">10:30 AM</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Sections */}
        <section id="features" className="mt-32 sm:mt-48">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-slate-200">
              Modern Portal Management Features
            </h2>
            <p className="mt-4 text-base text-slate-400 font-medium">
              Explore user-friendly features for student admissions, course fee payments, tracking due metrics, and automated PDF receipt layouts.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="group relative rounded-2xl border border-slate-900 bg-slate-900/20 p-8 hover:bg-slate-900/40 hover:border-slate-800 transition-all duration-300">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-400/10 text-teal-400 border border-teal-400/20">
                <i className="fas fa-file-signature text-lg"></i>
              </div>
              <h3 className="mt-6 text-lg font-bold text-slate-200">Inquiry Tracking</h3>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed font-medium">
                Submit, search, and pre-fill details using student Aadhaar numbers instantly.
              </p>
            </div>
            <div className="group relative rounded-2xl border border-slate-900 bg-slate-900/20 p-8 hover:bg-slate-900/40 hover:border-slate-800 transition-all duration-300">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-400/10 text-indigo-400 border border-indigo-400/20">
                <i className="fas fa-user-plus text-lg"></i>
              </div>
              <h3 className="mt-6 text-lg font-bold text-slate-200">Admissions Manager</h3>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed font-medium">
                Complete student enrollments, upload headshot photos, and track receipts.
              </p>
            </div>
            <div className="group relative rounded-2xl border border-slate-900 bg-slate-900/20 p-8 hover:bg-slate-900/40 hover:border-slate-800 transition-all duration-300">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-400/10 text-teal-400 border border-teal-400/20">
                <i className="fas fa-hand-holding-usd text-lg"></i>
              </div>
              <h3 className="mt-6 text-lg font-bold text-slate-200">Course Fee EMIs</h3>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed font-medium">
                Generate installment schedules, calculate partial plans, and track payments.
              </p>
            </div>
            <div className="group relative rounded-2xl border border-slate-900 bg-slate-900/20 p-8 hover:bg-slate-900/40 hover:border-slate-800 transition-all duration-300">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-400/10 text-indigo-400 border border-indigo-400/20">
                <i className="fas fa-receipt text-lg"></i>
              </div>
              <h3 className="mt-6 text-lg font-bold text-slate-200">Exam Fee Receipts</h3>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed font-medium">
                Generate, save, and print dual-receipt PDF copies for students and office audits.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Floating Glassmorphic Login Overlay Modal */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-slate-950 border border-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden animate-slide-up">
            
            {/* Background blobs for modal */}
            <div className="absolute top-0 right-0 -z-10 h-24 w-24 bg-teal-500/10 blur-xl rounded-full" />
            <div className="absolute bottom-0 left-0 -z-10 h-24 w-24 bg-indigo-500/10 blur-xl rounded-full" />

            <button
              onClick={() => { setShowLogin(false); setLoginError(""); }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-900 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors flex items-center justify-center"
            >
              <i className="fas fa-times"></i>
            </button>

            <div className="text-center pb-4 mb-6 border-b border-slate-900">
              <h2 className="text-xl font-bold bg-gradient-to-r from-teal-200 to-indigo-200 bg-clip-text text-transparent flex items-center justify-center gap-2">
                <i className="fas fa-lock text-teal-400"></i>SIGN IN PORTAL
              </h2>
              <p className="text-xs text-slate-500 mt-1">Authenticate to access the portal dashboard</p>
            </div>

            {loginError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-450 text-xs flex items-center gap-2">
                <i className="fas fa-exclamation-circle text-sm"></i>
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="username" className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Username</label>
                <input
                  type="text"
                  id="username"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="e.g. admin or kurla_staff"
                  className="w-full bg-slate-950 border border-slate-900 focus:border-teal-500/50 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-700 focus:outline-none transition-colors"
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="pass" className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Password</label>
                <input
                  type="password"
                  id="pass"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter account password"
                  className="w-full bg-slate-950 border border-slate-900 focus:border-teal-500/50 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-700 focus:outline-none transition-colors"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full mt-4 py-3 bg-gradient-to-r from-teal-400 to-indigo-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                {loginLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Signing in...
                  </>
                ) : (
                  <>
                    <i className="fas fa-sign-in-alt"></i>
                    Sign In
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 p-4 rounded-2xl bg-slate-900/30 border border-slate-900 text-[10px] text-slate-500 leading-normal space-y-1">
              <p className="font-bold text-slate-400 uppercase tracking-wider mb-1">Demo Credentials:</p>
              <p>• Admin: <span className="text-slate-300 font-semibold">admin</span> / Password: <span className="text-slate-300 font-semibold">Password123</span></p>
              <p>• Kurla Staff: <span className="text-slate-300 font-semibold">kurla_staff</span> / Password: <span className="text-slate-300 font-semibold">Password123</span></p>
              <p>• Karad Staff: <span className="text-slate-300 font-semibold">karad_staff</span> / Password: <span className="text-slate-300 font-semibold">Password123</span></p>
            </div>

          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-12 mt-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">TrustCare Portal</span>
          </div>
          <div>&copy; {new Date().getFullYear()} TrustCare Inc. All rights reserved.</div>
          <div className="flex gap-6">
            <a href="#privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
            <a href="#terms" className="hover:text-slate-300 transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
