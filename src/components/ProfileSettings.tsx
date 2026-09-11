import React, { useState, useEffect, useRef } from "react";
import { UserProfile, updateUserProfile } from "../lib/services/authService";
import {
    exportDataToGoogleSheetsXLSX,
    exportCompleteZipBackup,
    downloadBlankGoogleSheetsTemplate,
    parseBackupFile,
    executeImportData,
    ParsedImportData
} from "../lib/services/backupService";
import {
    FileSpreadsheet,
    Download,
    Upload,
    Archive,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Image as ImageIcon,
    Users,
    UserCheck,
    CreditCard,
    Clock,
    FileText,
    Sparkles,
    RefreshCw,
    Info,
    Check
} from "lucide-react";

interface ProfileSettingsProps {
    userProfile: UserProfile | null;
    onProfileUpdated: (profile: UserProfile) => void;
}

export default function ProfileSettings({ userProfile, onProfileUpdated }: ProfileSettingsProps) {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<"admin" | "staff">("staff");
    const [branch, setBranch] = useState("");
    const [instituteName, setInstituteName] = useState("");
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    // Backup & Migration States
    const [exportingXlsx, setExportingXlsx] = useState(false);
    const [exportingZip, setExportingZip] = useState(false);
    const [exportProgressText, setExportProgressText] = useState("");
    const [exportProgressPercent, setExportProgressPercent] = useState(0);

    // Import States
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [parsingFile, setParsingFile] = useState(false);
    const [parsedData, setParsedData] = useState<ParsedImportData | null>(null);
    const [uploadPhotos, setUploadPhotos] = useState(true);
    const [importing, setImporting] = useState(false);
    const [importProgressText, setImportProgressText] = useState("");
    const [importProgressPercent, setImportProgressPercent] = useState(0);
    const [importSuccessResult, setImportSuccessResult] = useState<string | null>(null);
    const [importError, setImportError] = useState("");

    useEffect(() => {
        if (userProfile) {
            setUsername(userProfile.username || "");
            setEmail(userProfile.email || "");
            setRole(userProfile.role || "staff");
            setBranch(userProfile.branch || "main");
            setInstituteName((userProfile as any).instituteName || "");
        }
    }, [userProfile]);

    const handleSave = async (field: string) => {
        if (!userProfile) return;
        setSaving(true);
        setErrorMsg("");
        setSuccessMsg("");

        const updateData: any = {};
        if (field === "account") {
            if (!username.trim()) { setErrorMsg("Username cannot be empty."); setSaving(false); return; }
            updateData.username = username.trim();
            updateData.email = email.trim();
            updateData.role = role;
            updateData.branch = branch.trim() || "main";
        } else if (field === "institute") {
            if (!instituteName.trim()) { setErrorMsg("Institute name cannot be empty."); setSaving(false); return; }
            updateData.instituteName = instituteName.trim();
        }

        try {
            await updateUserProfile(userProfile.uid, updateData);
            const updated = { ...userProfile, ...updateData };
            onProfileUpdated(updated);
            setSuccessMsg(`${field === "account" ? "Account" : "Institute"} settings updated successfully!`);
            setTimeout(() => setSuccessMsg(""), 3000);
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to update profile.");
        } finally {
            setSaving(false);
        }
    };

    // 1. One-Click Export to Google Sheets (.xlsx)
    const handleExportGoogleSheets = async () => {
        setExportingXlsx(true);
        setErrorMsg("");
        setSuccessMsg("");
        try {
            const res = await exportDataToGoogleSheetsXLSX();
            setSuccessMsg(`Google Sheets format exported successfully: ${res.filename}`);
            setTimeout(() => setSuccessMsg(""), 4000);
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to export Google Sheets format.");
        } finally {
            setExportingXlsx(false);
        }
    };

    // 2. One-Click Export Complete ZIP (with Student Photos)
    const handleExportCompleteZip = async () => {
        setExportingZip(true);
        setExportProgressPercent(0);
        setExportProgressText("Preparing backup package...");
        setErrorMsg("");
        setSuccessMsg("");
        try {
            const res = await exportCompleteZipBackup((msg, percent) => {
                setExportProgressText(msg);
                setExportProgressPercent(percent);
            });
            setSuccessMsg(`Complete archive with student photos exported: ${res.filename}`);
            setTimeout(() => setSuccessMsg(""), 5000);
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to export complete backup archive.");
        } finally {
            setExportingZip(false);
            setExportProgressText("");
            setExportProgressPercent(0);
        }
    };

    // 3. Handle File Selection for Import
    const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSelectedFile(file);
        setParsingFile(true);
        setImportError("");
        setImportSuccessResult(null);
        setParsedData(null);

        try {
            const parsed = await parseBackupFile(file, (msg) => {
                setImportProgressText(msg);
            });
            setParsedData(parsed);
        } catch (err: any) {
            console.error("Parse error:", err);
            setImportError(err.message || "Could not parse selected file.");
            setSelectedFile(null);
        } finally {
            setParsingFile(false);
            setImportProgressText("");
        }
    };

    // 4. Execute Import
    const handleExecuteImport = async () => {
        if (!parsedData) return;

        setImporting(true);
        setImportProgressPercent(0);
        setImportProgressText("Starting data import...");
        setImportError("");
        setImportSuccessResult(null);

        try {
            const result = await executeImportData(
                parsedData,
                { uploadPhotos },
                (msg, percent) => {
                    setImportProgressText(msg);
                    setImportProgressPercent(percent);
                }
            );

            setImportSuccessResult(result.message);
            // Reset parsed file after 3 seconds
            setTimeout(() => {
                setSelectedFile(null);
                setParsedData(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
            }, 3000);
        } catch (err: any) {
            console.error("Import execution failed:", err);
            setImportError(err.message || "Failed to import data into database.");
        } finally {
            setImporting(false);
        }
    };

    const handleCancelImport = () => {
        setSelectedFile(null);
        setParsedData(null);
        setImportError("");
        setImportSuccessResult(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div className="relative w-full max-w-4xl mx-auto bg-slate-950/60 border border-slate-900 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl overflow-hidden mt-4">
            <div className="absolute top-0 right-0 -z-10 h-48 w-48 bg-teal-500/10 blur-3xl rounded-full" />
            <div className="absolute bottom-0 left-0 -z-10 h-48 w-48 bg-indigo-500/10 blur-3xl rounded-full" />

            <div className="border-b border-slate-900 pb-4 mb-6 text-center">
                <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent flex items-center justify-center gap-3">
                    <i className="fas fa-cog text-teal-400"></i>PROFILE SETTINGS
                </h1>
                <p className="text-xs text-slate-400 mt-1">Manage account details, institute configuration, and one-click data migration</p>
            </div>

            {successMsg && (
                <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                    <span>{successMsg}</span>
                </div>
            )}
            {errorMsg && (
                <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
                    <span>{errorMsg}</span>
                </div>
            )}

            {/* Account Info - Editable */}
            <div className="bg-slate-950/40 border border-slate-900 rounded-2xl p-5 mb-6 space-y-4">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Users className="h-4 w-4 text-teal-400" /> Account Info
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-400">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 transition-colors"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-400">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 transition-colors"
                        />
                    </div>
                    {userProfile?.role === "admin" && (
                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-slate-400">Role</label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value as "admin" | "staff")}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-teal-500/50 transition-colors"
                            >
                                <option value="admin">Admin</option>
                                <option value="staff">Staff</option>
                            </select>
                        </div>
                    )}
                    {userProfile?.role === "admin" && (
                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-slate-400">Branch</label>
                            <input
                                type="text"
                                value={branch}
                                onChange={(e) => setBranch(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 transition-colors"
                                placeholder="main"
                            />
                        </div>
                    )}
                </div>
                <button
                    onClick={() => handleSave("account")}
                    disabled={saving}
                    className="px-5 py-2.5 bg-gradient-to-r from-teal-400 to-indigo-400 text-slate-950 font-bold text-xs rounded-xl hover:opacity-90 transition-all shadow-lg shadow-teal-500/10 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                    {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : <><Check className="h-4 w-4" />Save Account</>}
                </button>
            </div>

            {/* Institute Name Settings */}
            {userProfile?.role === "admin" && (
                <div className="bg-slate-950/40 border border-slate-900 rounded-2xl p-5 mb-6 space-y-4">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <FileText className="h-4 w-4 text-indigo-400" /> Institute Settings
                    </h3>

                    <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-400">Institute Name</label>
                        <input
                            type="text"
                            value={instituteName}
                            onChange={(e) => setInstituteName(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-700 focus:outline-none focus:border-teal-500/50 transition-colors"
                            placeholder="e.g. TrustCare Institute"
                        />
                        <p className="text-[10px] text-slate-500">This name appears on receipts and reports.</p>
                    </div>

                    <button
                        onClick={() => handleSave("institute")}
                        disabled={saving || !instituteName.trim()}
                        className="px-5 py-2.5 bg-gradient-to-r from-teal-400 to-indigo-400 text-slate-950 font-bold text-xs rounded-xl hover:opacity-90 transition-all shadow-lg shadow-teal-500/10 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                        {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : <><Check className="h-4 w-4" />Save Institute</>}
                    </button>
                </div>
            )}

            {/* ONE-CLICK DATA IMPORT & EXPORT SYSTEM (GOOGLE SHEETS & PHOTOS) */}
            {userProfile?.role === "admin" && (
                <div className="bg-gradient-to-b from-slate-900/60 to-slate-950/80 border border-teal-500/20 rounded-2xl p-6 space-y-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-40 w-40 bg-teal-500/10 blur-3xl pointer-events-none" />

                    {/* Section Title */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-900/80 pb-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="p-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400">
                                    <FileSpreadsheet className="h-5 w-5" />
                                </span>
                                <h2 className="text-base sm:text-lg font-bold text-slate-100">
                                    1-Click Data Backup & Migration
                                </h2>
                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
                                    Google Sheets Format
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                                Complete backup and restoration of <strong className="text-slate-200">Inquiry</strong>, <strong className="text-slate-200">Admission</strong>, <strong className="text-slate-200">Fees</strong>, and <strong className="text-slate-200">Due Fees</strong> including all student photos.
                            </p>
                        </div>

                        <button
                            onClick={downloadBlankGoogleSheetsTemplate}
                            className="text-xs font-semibold text-teal-400/90 hover:text-teal-300 flex items-center gap-1.5 self-start sm:self-center py-1.5 px-3 rounded-lg border border-teal-500/20 bg-teal-500/5 hover:bg-teal-500/10 transition-colors cursor-pointer"
                            title="Download blank Excel / Google Sheets template for bulk data preparation"
                        >
                            <Download className="h-3.5 w-3.5" />
                            <span>Download Blank Template</span>
                        </button>
                    </div>

                    {/* Included Collections Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                                <FileText className="h-4 w-4" />
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-200 block">Inquiries</span>
                                <span className="text-[10px] text-slate-400">All leads & contacts</span>
                            </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                                <UserCheck className="h-4 w-4" />
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-200 block">Admissions</span>
                                <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                                    <ImageIcon className="h-3 w-3" /> + Student Photos
                                </span>
                            </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                                <CreditCard className="h-4 w-4" />
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-200 block">Fees Structure</span>
                                <span className="text-[10px] text-slate-400">Payments & records</span>
                            </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                                <Clock className="h-4 w-4" />
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-200 block">Due Fees</span>
                                <span className="text-[10px] text-slate-400">Outstanding balances</span>
                            </div>
                        </div>
                    </div>

                    {/* EXPORT OPTIONS */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                            <Download className="h-3.5 w-3.5 text-teal-400" /> Export Options
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* 1. Google Sheets Excel Export */}
                            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-teal-500/30 transition-all flex flex-col justify-between space-y-3">
                                <div>
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-400" />
                                        <h5 className="text-sm font-bold text-slate-100">Google Sheets / Excel (.xlsx)</h5>
                                    </div>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        Downloads multi-sheet spreadsheet directly compatible with Google Sheets & Excel. Contains native <code className="text-[11px] text-teal-300 bg-slate-950 px-1 py-0.5 rounded">=IMAGE()</code> formulas to preview student photos right inside rows.
                                    </p>
                                </div>

                                <button
                                    onClick={handleExportGoogleSheets}
                                    disabled={exportingXlsx || exportingZip}
                                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                                >
                                    {exportingXlsx ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span>Generating Sheets...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Download className="h-4 w-4" />
                                            <span>Export Google Sheets (.xlsx)</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* 2. Complete ZIP Package with Downloaded Photos */}
                            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-teal-500/30 transition-all flex flex-col justify-between space-y-3">
                                <div>
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <Archive className="h-4.5 w-4.5 text-teal-400" />
                                        <h5 className="text-sm font-bold text-slate-100">Complete Archive (.zip)</h5>
                                    </div>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        Full package containing the Google Sheets <strong className="text-slate-300">.xlsx</strong> file, raw <strong className="text-slate-300">.json</strong> database, plus a <strong className="text-teal-300">student_photos/</strong> folder with all downloaded student photo image files.
                                    </p>
                                </div>

                                <button
                                    onClick={handleExportCompleteZip}
                                    disabled={exportingXlsx || exportingZip}
                                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-500/20 to-indigo-500/20 hover:from-teal-500/30 hover:to-indigo-500/30 border border-teal-500/30 text-teal-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-lg shadow-teal-500/5"
                                >
                                    {exportingZip ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span>Packaging Archive ({exportProgressPercent}%)...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Archive className="h-4 w-4" />
                                            <span>Export Full Archive with Photos (.zip)</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Export Progress Bar */}
                        {exportingZip && (
                            <div className="p-3 rounded-xl bg-slate-950 border border-teal-500/30 space-y-2 animate-fade-in">
                                <div className="flex justify-between text-xs text-teal-300 font-semibold">
                                    <span>{exportProgressText || "Generating export..."}</span>
                                    <span>{exportProgressPercent}%</span>
                                </div>
                                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-gradient-to-r from-teal-400 to-indigo-400 h-full transition-all duration-300"
                                        style={{ width: `${exportProgressPercent}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* IMPORT SECTION */}
                    <div className="border-t border-slate-900 pt-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                                <Upload className="h-3.5 w-3.5 text-indigo-400" /> One-Click Import & Restore
                            </h4>
                            <span className="text-[10px] text-slate-500">Supports .xlsx, .zip, .json</span>
                        </div>

                        {/* Hidden input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls,.zip,.json,.csv"
                            onChange={handleFileSelected}
                            className="hidden"
                        />

                        {/* Drop / Browse area */}
                        {!selectedFile && !importing && (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-slate-800 hover:border-teal-500/50 bg-slate-950/40 hover:bg-slate-950/70 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2 group"
                            >
                                <div className="mx-auto w-12 h-12 rounded-2xl bg-teal-500/10 group-hover:bg-teal-500/20 border border-teal-500/20 flex items-center justify-center text-teal-400 transition-all">
                                    <Upload className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-200">
                                        Click to browse or drop Google Sheets / Backup file
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Upload <strong className="text-slate-400">.xlsx</strong> (Google Sheets) or <strong className="text-slate-400">.zip</strong> archive with student photos
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Parsing File Indicator */}
                        {parsingFile && (
                            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-2">
                                <Loader2 className="h-6 w-6 animate-spin text-teal-400 mx-auto" />
                                <p className="text-xs font-semibold text-slate-300">{importProgressText || "Reading and analyzing file structure..."}</p>
                            </div>
                        )}

                        {/* Parsed Summary & Confirm Import Panel */}
                        {parsedData && !importing && !importSuccessResult && (
                            <div className="p-5 rounded-2xl bg-slate-950 border border-teal-500/30 space-y-4 animate-slide-up">
                                <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-5 w-5 text-teal-400" />
                                        <span className="text-sm font-bold text-slate-100">
                                            File Validated: <span className="text-teal-300 font-mono">{selectedFile?.name}</span>
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleCancelImport}
                                        className="text-xs text-slate-400 hover:text-slate-200"
                                    >
                                        Change File
                                    </button>
                                </div>

                                {/* Summary Grid */}
                                <div>
                                    <p className="text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-2">
                                        Detected Records Ready to Import:
                                    </p>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        <div className="bg-slate-900/70 border border-slate-800 p-2.5 rounded-xl">
                                            <span className="text-[10px] text-slate-400 uppercase block">Inquiries</span>
                                            <span className="text-base font-extrabold text-blue-400">
                                                {parsedData.summary.inquiriesCount}
                                            </span>
                                        </div>
                                        <div className="bg-slate-900/70 border border-slate-800 p-2.5 rounded-xl">
                                            <span className="text-[10px] text-slate-400 uppercase block">Admissions</span>
                                            <span className="text-base font-extrabold text-emerald-400">
                                                {parsedData.summary.admissionsCount}
                                            </span>
                                        </div>
                                        <div className="bg-slate-900/70 border border-slate-800 p-2.5 rounded-xl">
                                            <span className="text-[10px] text-slate-400 uppercase block">Fee Structures</span>
                                            <span className="text-base font-extrabold text-amber-400">
                                                {parsedData.summary.feeStructuresCount}
                                            </span>
                                        </div>
                                        <div className="bg-slate-900/70 border border-slate-800 p-2.5 rounded-xl">
                                            <span className="text-[10px] text-slate-400 uppercase block">Student Photos</span>
                                            <span className="text-base font-extrabold text-teal-400 flex items-center gap-1">
                                                <ImageIcon className="h-4 w-4" />
                                                {parsedData.summary.photosCount}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {parsedData.summary.photosCount > 0 && (
                                    <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none bg-slate-900/40 p-2.5 rounded-xl border border-slate-800">
                                        <input
                                            type="checkbox"
                                            checked={uploadPhotos}
                                            onChange={(e) => setUploadPhotos(e.target.checked)}
                                            className="h-4 w-4 text-teal-500 rounded border-slate-800 bg-slate-950 focus:ring-0"
                                        />
                                        <span>Automatically upload & sync all {parsedData.summary.photosCount} student photos to Cloud Storage</span>
                                    </label>
                                )}

                                <div className="flex items-center gap-3 pt-2">
                                    <button
                                        onClick={handleExecuteImport}
                                        className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-teal-400 to-indigo-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 hover:opacity-95 transition-all shadow-lg shadow-teal-500/10 cursor-pointer"
                                    >
                                        <Sparkles className="h-4 w-4" />
                                        <span>Confirm & Import Data</span>
                                    </button>
                                    <button
                                        onClick={handleCancelImport}
                                        className="py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* In-Progress Import Bar */}
                        {importing && (
                            <div className="p-5 rounded-2xl bg-slate-950 border border-teal-500/40 space-y-3 animate-fade-in">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-teal-300 flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
                                        {importProgressText}
                                    </span>
                                    <span className="text-xs font-bold text-teal-400 font-mono">{importProgressPercent}%</span>
                                </div>
                                <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className="bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400 h-full transition-all duration-300"
                                        style={{ width: `${importProgressPercent}%` }}
                                    />
                                </div>
                                <p className="text-[10px] text-slate-500 text-center">
                                    Please keep this window open while data is being written and photos are being uploaded.
                                </p>
                            </div>
                        )}

                        {/* Import Result Banner */}
                        {importSuccessResult && (
                            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-3 animate-slide-up">
                                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="font-bold text-emerald-300">Import Process Completed!</p>
                                    <p className="text-emerald-400/90 leading-relaxed">{importSuccessResult}</p>
                                </div>
                            </div>
                        )}

                        {/* Import Error Banner */}
                        {importError && (
                            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-3 animate-slide-up">
                                <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold">Import Failed</p>
                                    <p className="text-rose-400/90">{importError}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}