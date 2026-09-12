import React, { useState, useEffect, useRef, useMemo } from "react";
import { UserProfile } from "../lib/services/authService";
import { normalizeEnrollmentId } from "../lib/utils";
import { InquiryData, getInquiryAnalytics } from "../lib/services/inquiryService";
import { AdmissionData, getAdmissionAnalytics } from "../lib/services/admissionService";
import {
  FileText,
  ReceiptIndianRupee,
  GraduationCap,
  TrendingUp,
  BarChart3,
  Clock,
  LogOut,
  Search,
  Settings,
  User,
  Phone,
  CheckCircle2,
  BookOpen,
  Loader2,
  X
} from "lucide-react";

export type SuggestionItem =
  | {
      type: "admission";
      id: string;
      name: string;
      enrollmentId: string;
      course: string;
      phone?: string;
      data: AdmissionData;
    }
  | {
      type: "inquiry";
      id: string;
      name: string;
      phone: string;
      course: string;
      data: InquiryData;
    };

interface SidebarProps {
  userProfile: UserProfile | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onSearchStudentId?: (id: string) => void;
  onSelectInquiry?: (inquiry: InquiryData) => void;
  onSelectAdmission?: (admission: AdmissionData) => void;
}

export default function Sidebar({
  userProfile,
  activeTab,
  setActiveTab,
  onLogout,
  onSearchStudentId,
  onSelectInquiry,
  onSelectAdmission
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [inquiries, setInquiries] = useState<InquiryData[]>([]);
  const [admissions, setAdmissions] = useState<AdmissionData[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load admissions and inquiries for real-time autocomplete suggestions
  const loadSearchData = async () => {
    try {
      setLoadingData(true);
      const [admissionsRes, inquiriesRes] = await Promise.all([
        getAdmissionAnalytics(),
        getInquiryAnalytics()
      ]);
      setAdmissions(admissionsRes.data || []);
      setInquiries(inquiriesRes.data || []);
    } catch (err) {
      console.warn("Error pre-fetching search data in sidebar:", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadSearchData();
  }, []);

  // Global keydown listener: when user types anywhere on the page, focus the sidebar search input
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      // Ignore if user is already typing in an input, textarea, select, or contentEditable element
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      // Ignore meta keys, ctrl, alt, function keys, and non-character keys
      if (e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) {
        return;
      }

      // Focus sidebar search input and append the typed key if needed
      if (inputRef.current) {
        inputRef.current.focus();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered suggestions based on query
  const suggestions: SuggestionItem[] = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const results: SuggestionItem[] = [];

    // 1. Match Admissions
    for (const adm of admissions) {
      const fullName = (adm.studentName || `${adm.firstName || ""} ${adm.middleName || ""} ${adm.lastName || ""}`).trim();
      const enrollmentId = adm.enrollmentId || "";
      const receiptNo = adm.receiptNumber || "";
      const course = adm.courseName || "";

      if (
        fullName.toLowerCase().includes(q) ||
        enrollmentId.toLowerCase().includes(q) ||
        receiptNo.toLowerCase().includes(q)
      ) {
        results.push({
          type: "admission",
          id: `adm-${adm.enrollmentId || adm.id}`,
          name: fullName || "Unnamed Student",
          enrollmentId: enrollmentId,
          course: course,
          data: adm
        });
      }
    }

    // 2. Match Inquiries
    for (const inq of inquiries) {
      const fullName = (inq.fullName || `${inq.firstName || ""} ${inq.middleName || ""} ${inq.lastName || ""}`).trim();
      const phone = inq.phoneNo || inq.whatsappNo || inq.parentsNo || "";
      const course = inq.interestedCourse || "";
      const aadhar = inq.aadharNumber || "";

      if (
        fullName.toLowerCase().includes(q) ||
        phone.includes(q) ||
        aadhar.includes(q)
      ) {
        results.push({
          type: "inquiry",
          id: `inq-${inq.id || inq.phoneNo}`,
          name: fullName || "Unnamed Inquiry",
          phone: phone || "No Phone",
          course: course,
          data: inq
        });
      }
    }

    return results.slice(0, 10);
  }, [searchQuery, admissions, inquiries]);

  // Reset highlight index when suggestions change
  useEffect(() => {
    if (suggestions.length > 0) {
      setHighlightedIndex(0);
    } else {
      setHighlightedIndex(-1);
    }
  }, [suggestions]);

  // Auto-scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [highlightedIndex]);

  const handleSelectSuggestion = (item: SuggestionItem) => {
    setIsDropdownOpen(false);
    if (item.type === "admission") {
      setSearchQuery(item.enrollmentId);
      if (onSelectAdmission) {
        onSelectAdmission(item.data);
      } else if (onSearchStudentId) {
        onSearchStudentId(item.enrollmentId);
      }
    } else {
      setSearchQuery(item.name);
      if (onSelectInquiry) {
        onSelectInquiry(item.data);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setIsDropdownOpen(true);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (suggestions.length > 0) {
        setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (suggestions.length > 0) {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isDropdownOpen && highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        handleSelectSuggestion(suggestions[highlightedIndex]);
      } else if (suggestions.length > 0) {
        handleSelectSuggestion(suggestions[0]);
      } else if (searchQuery.trim() && onSearchStudentId) {
        const normalized = normalizeEnrollmentId(searchQuery);
        setSearchQuery(normalized);
        setIsDropdownOpen(false);
        onSearchStudentId(normalized);
      }
    } else if (e.key === "Escape") {
      setIsDropdownOpen(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDropdownOpen && highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
      handleSelectSuggestion(suggestions[highlightedIndex]);
      return;
    }
    if (onSearchStudentId && searchQuery.trim()) {
      const normalized = normalizeEnrollmentId(searchQuery);
      setSearchQuery(normalized);
      setIsDropdownOpen(false);
      onSearchStudentId(normalized);
    }
  };

  const navItems = [
    { id: "inquiry", label: "New Inquiry", icon: FileText },
    { id: "exam-receipt", label: "Exam Receipt", icon: ReceiptIndianRupee }
  ];

  const analyticsItems = [
    { id: "inquiry-analytics", label: "Inquiry", icon: BarChart3, roles: ["admin", "staff"] },
    { id: "admission-analytics", label: "Admission", icon: TrendingUp, roles: ["admin", "staff"] },
    { id: "fee-structure", label: "Fees", icon: GraduationCap, roles: ["admin"] },
    { id: "due-fees", label: "Due Fees", icon: Clock, roles: ["admin", "staff"] }
  ];

  const visibleAnalyticsItems = analyticsItems.filter((item) =>
    userProfile?.role === "admin" ? true : item.roles.includes("staff")
  );

  const adminItems = [
    { id: "course-management", label: "Course Management", icon: GraduationCap },
    { id: "profile-settings", label: "Profile Settings", icon: Settings }
  ];

  return (
    <aside className="fixed top-0 left-0 bg-slate-950 text-slate-100 w-64 hidden md:flex flex-col h-screen z-30 border-r border-slate-900 shadow-xl backdrop-blur-md glass-panel-dark gpu-accelerated">
      {/* Header */}
      <div className="px-6 py-6 border-b border-slate-900 bg-slate-950/20 flex flex-col items-center justify-center">
        <div className="mb-3 flex items-center justify-center">
          <div className="flex h-28 w-28 items-center justify-center">
            <img src="/TrustCareLogo.png" alt="TrustCare Logo" className="w-full h-full object-contain" />
          </div>
        </div>
        <div className="text-center leading-tight">
          <span className="text-lg font-black tracking-tight text-slate-100 block">
            TRUSTCARE
          </span>
          <span className="text-xs text-slate-400 tracking-wider font-semibold block mt-0.5">
            INSTITUTE OF HEALTH SCIENCE
          </span>
        </div>
        <div className="mt-3 flex flex-col items-center gap-1">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
            {userProfile?.username || "Guest User"}
          </p>
          <div className="flex gap-1.5 mt-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20 capitalize">
              {userProfile?.role || ""}
            </span>
          </div>
        </div>
      </div>

      {/* Student ID / Inquiry Search */}
      <div className="px-4 py-3 border-b border-slate-900 relative" ref={containerRef}>
        <form onSubmit={handleSearchSubmit} className="relative">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              SEARCH STUDENT / ID
            </label>
            {loadingData && (
              <Loader2 className="h-3 w-3 text-teal-400 animate-spin" />
            )}
          </div>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => {
                if (searchQuery.trim().length > 0) {
                  setIsDropdownOpen(true);
                }
              }}
              onKeyDown={handleKeyDown}
              className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-3 pr-8 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all font-medium"
              placeholder="Type name, phone or ID..."
              autoComplete="off"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setIsDropdownOpen(false);
                  inputRef.current?.focus();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button type="submit" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-400 transition-colors p-0.5">
                <Search className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Suggestion Dropdown — constrained to search bar width */}
            {isDropdownOpen && searchQuery.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-64 overflow-y-auto bg-white border border-gray-200 shadow-md rounded-lg">
                {suggestions.length > 0 ? (
                  <div ref={listRef}>
                    {suggestions.map((item, index) => {
                      const isHighlighted = highlightedIndex === index;
                      const isAdmission = item.type === "admission";

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleSelectSuggestion(item)}
                          onMouseEnter={() => setHighlightedIndex(index)}
                          className={`px-4 py-2.5 cursor-pointer select-none border-b border-gray-100 last:border-0 transition-colors ${
                            isHighlighted ? "bg-gray-50" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[13px] font-bold text-gray-900 leading-snug truncate">
                              {item.name}
                            </p>
                            <span className={`shrink-0 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              isAdmission
                                ? "bg-teal-50 text-teal-600"
                                : "bg-gray-100 text-gray-500"
                            }`}>
                              {isAdmission ? "Admission" : "Inquiry"}
                            </span>
                          </div>
                          {isAdmission ? (
                            <p className="text-[11px] font-semibold text-teal-600 mt-0.5">
                              {item.enrollmentId}
                            </p>
                          ) : (
                            <p className="text-[11px] font-semibold text-teal-600 mt-0.5 flex items-center gap-1">
                              <Phone className="h-2.5 w-2.5 shrink-0" />
                              {item.phone}
                            </p>
                          )}
                          {item.course && (
                            <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                              {item.course.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-4 py-3 text-center">
                    <p className="text-xs text-gray-500">No results found</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
        {/* Main Navigation */}
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">MAIN</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-xl transition-all duration-200 focus:outline-none hover-lift border ${activeTab === item.id
                  ? "bg-gradient-to-r from-teal-500/10 to-indigo-500/5 text-teal-400 border-teal-500/25"
                  : "text-slate-400 hover:bg-slate-900/40 hover:text-slate-200 border-transparent"
                  }`}
              >
                <div className="flex items-center justify-center w-5 h-5">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Analytics Section */}
        {visibleAnalyticsItems.length > 0 && (
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">ANALYTICS</p>
            {visibleAnalyticsItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-xl transition-all duration-200 focus:outline-none hover-lift border ${activeTab === item.id
                    ? "bg-gradient-to-r from-teal-500/10 to-indigo-500/5 text-teal-400 border-teal-500/25"
                    : "text-slate-400 hover:bg-slate-900/40 hover:text-slate-200 border-transparent"
                    }`}
                >
                  <div className="flex items-center justify-center w-5 h-5">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Admin Section */}
        {userProfile?.role === "admin" && (
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">ADMIN</p>
            {adminItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-xl transition-all duration-200 focus:outline-none hover-lift border ${activeTab === item.id
                    ? "bg-gradient-to-r from-teal-500/10 to-indigo-500/5 text-teal-400 border-teal-500/25"
                    : "text-slate-400 hover:bg-slate-900/40 hover:text-slate-200 border-transparent"
                    }`}
                >
                  <div className="flex items-center justify-center w-5 h-5">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-900/80 bg-slate-950/20">
        <button
          onClick={onLogout}
          className="group w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-rose-450 rounded-xl hover:bg-rose-500/10 hover:text-rose-350 transition-all duration-200 focus:outline-none border border-transparent hover:border-rose-500/10"
        >
          <div className="flex items-center justify-center w-5 h-5">
            <LogOut className="h-4.5 w-4.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}