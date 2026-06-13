import React from "react";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Background blobs / glows */}
      <div className="absolute top-0 left-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-teal-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-[600px] w-[600px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-[800px] w-[800px] rounded-full bg-slate-900/50 blur-[50px] border border-slate-800/20 pointer-events-none" />

      {/* Header/Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b border-slate-900 bg-slate-950/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-400 to-indigo-500 shadow-lg shadow-teal-500/20">
                <svg
                  className="h-6 w-6 text-slate-950"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-13.332 9-8.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
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
              <a
                id="btn-nav-signin"
                href="#signin"
                className="hidden sm:inline-block text-sm font-medium text-slate-300 hover:text-teal-400 transition-colors"
              >
                Sign In
              </a>
              <a
                id="btn-nav-register"
                href="#register"
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-teal-400 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:opacity-95 active:scale-98 transition-all shadow-md shadow-teal-400/10 hover:shadow-teal-400/20"
              >
                Get Started
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Hero Section */}
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
              <a
                id="btn-hero-launch"
                href="#launch"
                className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl bg-teal-400 px-8 py-4 text-base font-bold text-slate-950 hover:bg-teal-300 transition-colors shadow-lg shadow-teal-400/20 active:scale-98"
              >
                Launch Dashboard
              </a>
              <a
                id="btn-hero-learn"
                href="#features"
                className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900 hover:border-slate-700 px-8 py-4 text-base font-semibold text-slate-200 transition-all"
              >
                Learn More
              </a>
            </div>

            {/* Quick stats / trust list */}
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

          {/* Interactive Mockup Container */}
          <div id="dashboard" className="lg:col-span-5 relative mt-8 lg:mt-0">
            {/* Soft decorative ring behind card */}
            <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-teal-400 to-indigo-500 opacity-20 blur-lg" />
            
            {/* Premium Glassmorphic Card Mockup */}
            <div className="relative rounded-2xl border border-slate-800/80 bg-slate-950/80 p-6 shadow-2xl backdrop-blur-xl">
              {/* Card Header */}
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

              {/* Patient Vitals Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Heart Rate */}
                <div className="rounded-xl border border-slate-900 bg-slate-900/30 p-4 hover:border-slate-800 transition-colors">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-medium">Heart Rate</span>
                    <svg className="h-4 w-4 text-rose-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-slate-200">72</span>
                    <span className="text-xs text-slate-500">bpm</span>
                  </div>
                </div>

                {/* Blood Oxygen */}
                <div className="rounded-xl border border-slate-900 bg-slate-900/30 p-4 hover:border-slate-800 transition-colors">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-medium">SpO2</span>
                    <svg className="h-4 w-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-slate-200">98</span>
                    <span className="text-xs text-slate-500">%</span>
                  </div>
                </div>
              </div>

              {/* Medical Actions Showcase */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Upcoming Appointments</div>
                
                <div className="flex items-center justify-between rounded-xl border border-slate-900 bg-slate-900/50 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
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

                <div className="flex items-center justify-between rounded-xl border border-slate-900 bg-slate-900/50 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200">Annual Checkup</h4>
                      <p className="text-[10px] text-slate-500">Lab Reports Pending</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-indigo-400 block">July 02</span>
                    <span className="text-[10px] text-slate-500 block">09:00 AM</span>
                  </div>
                </div>
              </div>

              {/* Secure Chat snippet */}
              <div className="mt-6 pt-4 border-t border-slate-900 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 block animate-pulse" />
                  E2E Encrypted Line Active
                </div>
                <button 
                  id="btn-mock-message"
                  className="text-xs font-bold text-teal-400 hover:text-teal-300 transition-colors"
                >
                  Send Message &rarr;
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Cards Grid Section */}
        <section id="features" className="mt-32 sm:mt-48">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-slate-200">
              Modern Patient Care Features
            </h2>
            <p className="mt-4 text-base text-slate-400">
              A comprehensive toolkit for patients and clinicians alike, built with data protection and ease-of-use at the core.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Feature 1 */}
            <div className="group relative rounded-2xl border border-slate-900 bg-slate-900/20 p-8 hover:bg-slate-900/40 hover:border-slate-800/80 transition-all duration-300">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-400/10 text-teal-400 border border-teal-400/20 group-hover:scale-105 transition-transform">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="mt-6 text-lg font-bold text-slate-200">Secure Messaging</h3>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                Connect directly with your primary care provider. Fully HIPAA compliant secure pipeline keeps conversations private.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group relative rounded-2xl border border-slate-900 bg-slate-900/20 p-8 hover:bg-slate-900/40 hover:border-slate-800/80 transition-all duration-300">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-400/10 text-indigo-400 border border-indigo-400/20 group-hover:scale-105 transition-transform">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="mt-6 text-lg font-bold text-slate-200">Digital Health Records</h3>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                Retrieve lab results, pathology reports, prescription histories, and clinical discharge summaries anytime.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group relative rounded-2xl border border-slate-900 bg-slate-900/20 p-8 hover:bg-slate-900/40 hover:border-slate-800/80 transition-all duration-300">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-400/10 text-teal-400 border border-teal-400/20 group-hover:scale-105 transition-transform">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="mt-6 text-lg font-bold text-slate-200">Telehealth Visits</h3>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                Join high-definition virtual care consultations with healthcare providers from the comfort of your home.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group relative rounded-2xl border border-slate-900 bg-slate-900/20 p-8 hover:bg-slate-900/40 hover:border-slate-800/80 transition-all duration-300">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-400/10 text-indigo-400 border border-indigo-400/20 group-hover:scale-105 transition-transform">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="mt-6 text-lg font-bold text-slate-200">Family Account Access</h3>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                Manage dependents, verify immunization records, and authorize care approvals easily in a combined view.
              </p>
            </div>
          </div>
        </section>

        {/* Security / Compliance details */}
        <section id="security" className="mt-32 sm:mt-48 rounded-3xl border border-slate-900 bg-slate-900/10 p-8 sm:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-40 w-40 bg-teal-500/5 blur-3xl rounded-full" />
          
          <div className="max-w-3xl">
            <span className="text-xs font-bold text-teal-400 uppercase tracking-widest">Enterprise Trust</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-200 mt-2">
              Security standards you can count on
            </h2>
            <p className="mt-4 text-base text-slate-400 leading-relaxed">
              We understand that medical information is private and highly sensitive. TrustCare utilizes industry-grade AES-256 E2E encryption algorithms to shield communications. Our servers undergo quarterly external audits to ensure 100% compliance with SOC2 Type II and HIPAA requirements.
            </p>
            
            <div className="mt-8 flex flex-wrap gap-4">
              <div className="flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-300 border border-slate-900">
                <svg className="h-4 w-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-13.332 9-8.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                HIPAA Compliant
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-300 border border-slate-900">
                <svg className="h-4 w-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-13.332 9-8.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                SOC2 Type II
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-300 border border-slate-900">
                <svg className="h-4 w-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-13.332 9-8.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                HITECH Certified
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-12 mt-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-400/20 text-teal-400">
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622" />
              </svg>
            </div>
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

