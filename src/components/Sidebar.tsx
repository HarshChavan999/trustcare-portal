import React from "react";
import { UserProfile } from "../lib/services/authService";

interface SidebarProps {
  userProfile: UserProfile | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onSearchStudentId?: (id: string) => void;
}

export default function Sidebar({
  userProfile,
  activeTab,
  setActiveTab,
  onLogout,
  onSearchStudentId
}: SidebarProps) {
  const [searchId, setSearchId] = React.useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearchStudentId && searchId.trim()) {
      onSearchStudentId(searchId.trim());
    }
  };

  const navItems = [
    { id: "inquiry", label: "New Inquiry", icon: "fa-file-signature" },
    { id: "admission", label: "New Admission", icon: "fa-user-plus" },
    { id: "payment", label: "Course Payment", icon: "fa-hand-holding-usd" },
    { id: "exam-receipt", label: "Exam Receipt", icon: "fa-receipt" }
  ];

  const adminItems = [
    { id: "course-management", label: "Course Management", icon: "fa-graduation-cap" },
    { id: "profile-settings", label: "Profile Settings", icon: "fa-cog" }
  ];

  const analyticsItems = [
    { id: "fee-structure", label: "Fees Structure", icon: "fa-university" },
    { id: "admission-analytics", label: "Admission Structure", icon: "fa-chart-line" },
    { id: "inquiry-analytics", label: "Inquiry Structure", icon: "fa-chart-bar" },
    { id: "due-fees", label: "Due Fees", icon: "fa-clock" }
  ];

  return (
    <aside className="fixed top-0 left-0 bg-slate-950 text-slate-100 w-64 hidden md:flex flex-col h-screen z-30 border-r border-slate-900 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="px-6 py-6 border-b border-slate-900 bg-slate-950/50 flex flex-col items-center justify-center">
        <div className="mb-3 flex items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-400 to-indigo-500 shadow-lg shadow-teal-500/20">
            <svg
              className="h-8 w-8 text-slate-950"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622"
              />
            </svg>
          </div>
        </div>
        <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-teal-200 to-indigo-200 bg-clip-text text-transparent">
          TrustCare Portal
        </span>
        <div className="mt-3 flex flex-col items-center gap-1">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest">
            {userProfile?.username || "Guest User"}
          </p>
          <div className="flex gap-1.5 mt-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20 capitalize">
              {userProfile?.role || "staff"}
            </span>
          </div>
        </div>
      </div>

      {/* Student ID Search */}
      {onSearchStudentId && (
        <div className="px-4 py-3 border-b border-slate-900">
          <form onSubmit={handleSearchSubmit} className="relative">
            <label className="block text-[10px] text-slate-500 font-semibold mb-1 uppercase tracking-wider">Search Enrollment ID</label>
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-3 pr-8 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500/50 transition-colors"
              placeholder="e.g. ST001"
            />
            <button type="submit" className="absolute right-2 top-[22px] text-slate-400 hover:text-teal-400 transition-colors">
              <i className="fas fa-search text-xs"></i>
            </button>
          </form>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
        {/* Main Navigation */}
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Main</p>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none ${activeTab === item.id
                ? "bg-gradient-to-r from-teal-500/10 to-indigo-500/5 text-teal-400 border border-teal-500/20"
                : "text-slate-400 hover:bg-slate-900/50 hover:text-slate-200 border border-transparent"
                }`}
            >
              <div className="flex items-center justify-center w-5 h-5">
                <i className={`fas ${item.icon} text-sm`}></i>
              </div>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Admin Section */}
        {userProfile?.role === "admin" && (
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Admin</p>
            {adminItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none ${activeTab === item.id
                  ? "bg-gradient-to-r from-teal-500/10 to-indigo-500/5 text-teal-400 border border-teal-500/20"
                  : "text-slate-400 hover:bg-slate-900/50 hover:text-slate-200 border border-transparent"
                  }`}
              >
                <div className="flex items-center justify-center w-5 h-5">
                  <i className={`fas ${item.icon} text-sm`}></i>
                </div>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Analytics Section */}
        {userProfile?.role === "admin" && (
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Analytics (Admin)</p>
            {analyticsItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none ${activeTab === item.id
                  ? "bg-gradient-to-r from-teal-500/10 to-indigo-500/5 text-teal-400 border border-teal-500/20"
                  : "text-slate-400 hover:bg-slate-900/50 hover:text-slate-200 border border-transparent"
                  }`}
              >
                <div className="flex items-center justify-center w-5 h-5">
                  <i className={`fas ${item.icon} text-sm`}></i>
                </div>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-900 bg-slate-950/20">
        <button
          onClick={onLogout}
          className="group w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-rose-400 rounded-lg hover:bg-rose-500/10 hover:text-rose-300 transition-all duration-200 focus:outline-none"
        >
          <div className="flex items-center justify-center w-5 h-5">
            <i className="fas fa-sign-out-alt text-sm group-hover:translate-x-0.5 transition-transform"></i>
          </div>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
