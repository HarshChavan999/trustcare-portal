import { Installment } from "../lib/services/paymentService";

interface ReceiptData {
  enrollmentId: string;
  studentName: string;
  courseName: string;
  courseDuration: string;
  totalFees: number;
  totalPayable: number;
  discountRupees: number;
  paymentType: "full" | "partial" | "emi" | "";
  paymentMethod: string;
  schedule: Installment[];
  receiptNo: string;
  branch: string;
  admissionFee?: number;
  guardianName?: string;
  guardianRelation?: string;
}

const mrPoints = [
  "भरलेली फी परत मिळणार नाही.",
  "दिलेल्या तारखेवर फी भरावी अन्यथा आम्ही दंड घेऊ.",
  "जर तुम्हाला प्रवेश रद्द करायचा असल्यास तुम्हाला पूर्ण फी भरणे गरजेचे आहे.",
  "जर तुम्हा गैरवर्तन केले तर तुमचं प्रवेश रद्द करण्यात येईल.",
  "तुमचे गुण तुमच्या उपस्थिती आणि तुमच्या वर्तनावर अवलंबून असतील.",
  "आठ दिवसांपेक्षा जास्त गैरहजर असल्यास तुमचे प्रवेश रद्द करण्यात येईल.",
  "परिक्षेचे फी एक महिना अगोदर भरावी.",
  "जर तुम्ही OJT मध्येच थांबवली तर TCIHS तुमच्यासाठी जबाबदार नाही.",
  "100% नोकरीची हमी",
  "75% उपस्थिती अनिवार्य आहे.",
  "दिलेल्या वेळापकानुसार परिक्षा द्यावी उशीर केल्यास परिक्षेचे फी वाढेल याला राहणार TCIHS नाही",
  "जर तुम्ही व तुमचे पालक दिलेल्या अटी विरोधात वाद घातला तर कायदेशीर रित्या कारवाई केली जाईल. वर्गात नेहमी वेळेवर येणार अनिवार्य आहे. अन्यथा वर्गात प्रवेश दिला जाणार नाही.",
];

const enPoints = [
  "Paid Fees Not Refundable.",
  "Pay Your Fees Above Given Date Otherwise We Charge Penalties.",
  "If You Want To Cancel Admission Still You Have To Pay Full Fees.",
  "If You Misbehave Then We Will Cancel Your Admission.",
  "Final Marks Are Based On Attendance And Behavior Etc.",
  "More Than 8 Days absent Will Cancel The Admission, Without Your Permission.",
  "Exam Fees Should Have To Pay Before 1 Month Of Exam.",
  "If You Dropping OJT, TCIHS Is Not Responsible For You.",
  "100% Job Assurance",
  "75% Attendance Should Be Compulsory.",
  "Give Exam In Given Schedule. If You Delay Then TCIHS Will Not Responsible, Exam Fees Will Increase.",
  "If You And Your Guardian Argue Against The Terms And Conditions, Legal Action Will Be Taken.",
  "It Is compulsory To Come on Time Otherwise You Are Not Permitted To Sit In Lecture.",
];

const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept.", "Oct.", "Nov.", "Dec."];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

export function openCoursePaymentReceipt(data: ReceiptData) {
  const logoBase64 = "/TrustCareLogo.avif";
  const courseLabel = data.courseName.replace(/_/g, " ").toUpperCase();

  const paidInstallments = data.schedule.filter((inst) => inst.status === "Paid");
  const totalPaid = paidInstallments.reduce((acc, inst) => acc + inst.amount, 0);
  const balanceAmount = Math.max(0, data.totalPayable - totalPaid);

  const formattedPayable = formatCurrency(data.totalPayable);
  const formattedPaid = formatCurrency(totalPaid);
  const formattedBalance = formatCurrency(balanceAmount);
  const formattedDiscount = data.discountRupees > 0 ? formatCurrency(data.discountRupees) : "—";

  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yyyy = today.getFullYear();

  const years = data.courseDuration ? parseInt(data.courseDuration.split(" ")[0]) || 1 : 1;
  const suffix = (n: number) => (n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th");

  // Per-year fee (for multi-year courses show the yearly breakdown)
  const perYearFee = years > 1 ? Math.round(data.totalFees / years) : data.totalFees;
  const formattedAdmissionFee = formatCurrency(data.admissionFee ?? 5000);
  const formattedPerYearFee = formatCurrency(perYearFee);
  const formattedTotalFees = formatCurrency(data.totalFees);

  // Build installment schedule split into single 12-month tables per year
  const buildInstallmentTable = () => {
    if (!data.schedule || data.schedule.length === 0) return "";

    const firstInstDate = data.schedule[0]?.dueDate ? new Date(data.schedule[0].dueDate) : new Date();
    const startYear = firstInstDate.getFullYear();
    const startMonth = firstInstDate.getMonth();
    const defaultDay = firstInstDate.getDate();

    const getDaySuffix = (n: number) => {
      if (n >= 11 && n <= 13) return "th";
      switch (n % 10) {
        case 1:  return "st";
        case 2:  return "nd";
        case 3:  return "rd";
        default: return "th";
      }
    };

    const getDaysInMonth = (year: number, monthIndex: number) => {
      return new Date(year, monthIndex + 1, 0).getDate();
    };

    const getValidDayForMonth = (year: number, monthIndex: number, targetDay: number) => {
      const maxDays = getDaysInMonth(year, monthIndex);
      return Math.min(targetDay, maxDays);
    };

    const mappedInstallments = data.schedule.map((inst, idx) => {
      const due = inst.dueDate ? new Date(inst.dueDate) : new Date(startYear, startMonth + idx, 1);
      const globalMonthIndex = (due.getFullYear() - startYear) * 12 + due.getMonth();
      const yearIndex = Math.floor(globalMonthIndex / 12);
      const monthIndex = due.getMonth();
      const day = due.getDate();
      return { yearIndex, monthIndex, amount: inst.amount, status: inst.status, day, fullDate: due };
    });

    const maxYearIndex = Math.max(...mappedInstallments.map((m) => m.yearIndex), years - 1);
    const totalYears = Math.max(maxYearIndex + 1, years);

    let tablesHtml = "";

    for (let y = 0; y < totalYears; y++) {
      const yearInsts = mappedInstallments.filter((m) => m.yearIndex === y);
      const grid: (typeof yearInsts[0] | null)[] = Array(12).fill(null);
      for (const inst of yearInsts) {
        grid[inst.monthIndex] = inst;
      }

      const headerCells = monthLabels
        .map((lbl, mi) => {
          const inst = grid[mi];
          const targetYear = startYear + y + (mi < startMonth ? 1 : 0);
          const day = inst ? inst.day : defaultDay;
          const validDay = getValidDayForMonth(targetYear, mi, day);
          const dateLabel = `${validDay}<sup>${getDaySuffix(validDay)}</sup> ${lbl}`;
          return `<td style="border:1.5px solid #000;padding:5px 1px;text-align:center;font-size:9.5px;font-weight:bold;background:#fff;color:#000;width:8.33%;">${dateLabel}</td>`;
        })
        .join("");

      const amountCells = monthLabels
        .map((_, i) => {
          const inst = grid[i];
          if (inst) {
            return `<td style="border:1.5px solid #000;height:24px;text-align:center;font-size:9.5px;font-weight:bold;background:#fff;color:#000;">₹${inst.amount.toLocaleString("en-IN")}</td>`;
          }
          return `<td style="border:1.5px solid #000;height:24px;background:#fff;"></td>`;
        })
        .join("");

      const statusCells = monthLabels
        .map((_, i) => {
          const inst = grid[i];
          if (inst && inst.status === "Paid") {
            return `<td style="border:1.5px solid #000;height:22px;text-align:center;font-size:9px;font-weight:bold;background:#fff;color:#059669;">Paid</td>`;
          }
          return `<td style="border:1.5px solid #000;height:22px;background:#fff;"></td>`;
        })
        .join("");

      tablesHtml += `
        <div style="margin-top:10px;">
          <div style="font-weight:bold;font-size:13px;margin-bottom:4px;color:#000;font-family:Arial, sans-serif;">
            ${y + 1}<sup>${suffix(y + 1)}</sup> Year Fee's 20
          </div>
          <table style="width:100%;border-collapse:collapse;border:1.5px solid #000;table-layout:fixed;margin-bottom:4px;">
            <thead>
              <tr>${headerCells}</tr>
            </thead>
            <tbody>
              <tr>${amountCells}</tr>
              <tr>${statusCells}</tr>
            </tbody>
          </table>
        </div>`;
    }

    return tablesHtml;
  };

  const installmentTableHtml = buildInstallmentTable();

  const receiptHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=794">
  <title>Course Payment Receipt - ${data.receiptNo || data.enrollmentId}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      font-family: Arial, Helvetica, sans-serif;
      background: #2bb6bc;
      color: #000;
    }
    .print-bar {
      height: 50px;
      background: #1e293b;
      border-bottom: 2px solid #334155;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 18px;
      flex-shrink: 0;
    }
    .print-bar button {
      padding: 7px 24px;
      background: #14507a;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: bold;
      cursor: pointer;
    }
    .print-bar p { font-size: 11px; color: #94a3b8; }
    .scroll-area {
      height: calc(100vh - 50px);
      overflow-y: auto;
      padding: 14px 0 24px;
    }
    .sheet {
      width: 794px;
      min-height: 1123px;
      height: 1123px;
      margin: 0 auto 18px;
      background: #fff;
      padding: 24px 32px 32px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      position: relative;
      overflow: hidden;
      border: 14px solid #2bb6bc;
    }
    .sheet::before {
      content: "";
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background-image: url('${logoBase64}');
      background-repeat: no-repeat;
      background-position: center 48%;
      background-size: 550px;
      opacity: 0.08;
      z-index: 0;
      pointer-events: none;
    }
    .field-row {
      display: flex;
      align-items: baseline;
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 9px;
      gap: 6px;
      flex-wrap: wrap;
    }
    .field-line {
      border-bottom: 1.5px solid #000;
      flex: 1;
      min-width: 60px;
      padding-bottom: 1px;
      font-weight: 700;
    }
    .field-fixed-sm { border-bottom: 1.5px solid #000; display:inline-block; min-width:120px; padding: 0 4px; font-weight:700; }
    .field-fixed-md { border-bottom: 1.5px solid #000; display:inline-block; min-width:170px; padding: 0 4px; font-weight:700; }
    .field-fixed-lg { border-bottom: 1.5px solid #000; display:inline-block; min-width:240px; padding: 0 4px; font-weight:700; }
    .bottom-section {
      position: absolute;
      bottom: 32px;
      left: 32px;
      right: 32px;
      z-index: 2;
    }
    @media print {
      html, body { overflow: visible; height: auto; background: #fff; }
      .print-bar { display: none !important; }
      .scroll-area { height: auto; overflow: visible; padding: 0; }
      .sheet {
        width: 100%;
        min-height: 100vh;
        height: 100vh;
        margin: 0;
        padding: 24px 32px 32px;
        box-shadow: none;
        page-break-after: always;
        border: 14px solid #2bb6bc;
      }
      .sheet:last-child { page-break-after: auto; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <button onclick="window.print()">&#128424; Print Receipt</button>
    <p>Press Ctrl+P (Cmd+P on Mac) to print. Close this tab when done.</p>
  </div>
  <div class="scroll-area">

  <!-- PAGE 1: ADMISSION FORM -->
  <div class="sheet">

    <!-- Header -->
    <div style="display:flex;align-items:center;gap:14px;padding-bottom:12px;margin-bottom:6px;position:relative;z-index:2;">
      <img src="${logoBase64}" alt="Logo" style="width:84px;height:84px;border-radius:50%;border:2px solid #14507a;object-fit:cover;flex-shrink:0;" />
      <div style="flex-grow:1;">
        <div style="color:#0b5175;font-size:23px;font-weight:900;letter-spacing:0.3px;line-height:1.2;font-family:'Arial Black', Impact, Arial, sans-serif;">TRUSTCARE INSTITUTE OF HEALTH SCIENCE</div>
        <div style="font-weight:700;font-size:11.5px;color:#000;margin-top:5px;display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
          <span>Email: trustcareinstitute03@gmail.com</span>
          <span style="color:#555;">|</span>
          <span style="display:flex;align-items:center;gap:4px;">
            <span style="background-color:#d32f2f;color:white;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:11px;">&#9742;</span> +91 9967340243
          </span>
          <span style="color:#555;">|</span>
          <span style="display:flex;align-items:center;gap:4px;">
            <span style="background-color:#d32f2f;color:white;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:11px;">&#9742;</span> +91 9967288158
          </span>
        </div>
      </div>
    </div>

    <!-- Address -->
    <div style="border-top:1.5px solid #000;border-bottom:1.5px solid #000;text-align:center;font-weight:800;font-size:10.5px;padding:5px 0;color:#000;margin-bottom:12px;text-transform:uppercase;position:relative;z-index:2;">
      TRUSTCARE INSTITUTE OF HEALTH SCIENCE, 1ST FLOOR, SHIVSENA OFFICE, BHARAT NAGAR, MANKHURD, MUMBAI - 400 088.
    </div>

    <!-- Title Banner -->
    <div style="background:#14507a;color:#fff;text-align:center;font-weight:900;font-size:20px;padding:8px 0;margin-bottom:16px;clip-path:polygon(15px 0%, 100% 0%, calc(100% - 15px) 100%, 0% 100%);letter-spacing:2px;max-width:320px;margin-left:auto;margin-right:auto;position:relative;z-index:2;font-family:Arial, sans-serif;">
      ADMISSION FORM
    </div>

    <!-- Receipt No & Date -->
    <div style="display:flex;justify-content:space-between;margin-bottom:12px;font-size:14px;font-weight:700;color:#000;position:relative;z-index:2;">
      <div>Receipt No. <span class="field-fixed-md">&nbsp;${data.receiptNo || ""}</span></div>
      <div>Date : <span class="field-fixed-sm" style="text-align:center;">&nbsp;${dd} / ${mm} / ${yyyy}</span></div>
    </div>

    <div style="position:relative;z-index:2;">
      <!-- Student Name -->
      <div class="field-row">
        <span style="white-space:nowrap;">Student Name</span>
        <span class="field-line">&nbsp;${data.studentName}</span>
      </div>

      <!-- Course Name -->
      <div class="field-row">
        <span style="white-space:nowrap;">Course Name</span>
        <span class="field-line">&nbsp;${courseLabel}</span>
      </div>

      <!-- Duration + Admission Fees -->
      <div class="field-row">
        <span style="white-space:nowrap;">Course Duration</span>
        <span class="field-line" style="max-width:180px;">&nbsp;${data.courseDuration}</span>
        <span style="white-space:nowrap;margin-left:14px;">Admission Fees</span>
        <span class="field-line">&nbsp;${formattedAdmissionFee}</span>
      </div>

      <!-- Total Course Fees -->
      <div class="field-row">
        <span style="white-space:nowrap;">Total Course Fees</span>
        <span class="field-line" style="max-width:120px;">&nbsp;${formattedPerYearFee}</span>
        <span style="white-space:nowrap;">&times;</span>
        <span class="field-line" style="max-width:100px;text-align:center;">&nbsp;${years} Year${years > 1 ? "s" : ""}</span>
        <span style="white-space:nowrap;">=</span>
        <span class="field-line">&nbsp;${formattedTotalFees}</span>
        <span style="white-space:nowrap;">Total</span>
      </div>

      <!-- Discount + Exam Fees -->
      <div class="field-row">
        <span style="white-space:nowrap;">Discount</span>
        <span class="field-line" style="max-width:150px;">&nbsp;${formattedDiscount}</span>
        <span style="white-space:nowrap;margin-left:14px;">Exam Fees</span>
        <span class="field-line">&nbsp;</span>
      </div>

      <!-- Monthly Fee Schedule -->
      ${installmentTableHtml}

      <!-- Total Payable -->
      <div style="margin-top:10px;text-align:right;font-size:14px;font-weight:900;color:#000;border-top:1.5px solid #000;padding-top:6px;font-family:Arial, sans-serif;">
        Total Payable : <span style="font-size:16px;">${formattedPayable}</span>
      </div>
    </div>

    <!-- Pinned bottom section: guardian declaration + signatures -->
    <div class="bottom-section">
      <div style="border-top:1.5px solid #000;padding-top:8px;">
        <!-- English declaration -->
        <div style="font-size:12px;font-weight:700;line-height:1.6;margin-bottom:4px;color:#000;">
          I Am Mr./Ms : <span style="border-bottom:1.5px solid #000;display:inline-block;min-width:160px;padding:0 4px;font-weight:700;">&nbsp;${data.guardianName || ""}</span>
          &nbsp;Mother / Father / Husband / Sister / Brother of
          <span style="border-bottom:1.5px solid #000;display:inline-block;min-width:140px;padding:0 4px;font-weight:700;">&nbsp;${data.studentName}</span>
          &nbsp;&#8212; I Agree with Terms And Condition.
        </div>
        <!-- Marathi declaration -->
        <div style="font-size:12px;font-weight:800;color:#000;line-height:1.6;font-family:Arial, sans-serif;">
          &#2350;&#2366;.&#2358;&#2381;&#2352;&#2368;./&#2358;&#2381;&#2352;&#2368;&#2350;&#2340;&#2368; <span style="border-bottom:1.5px solid #000;display:inline-block;min-width:160px;padding:0 4px;font-weight:700;">&nbsp;${data.guardianName || ""}</span>
          &#2310;&#2312; / &#2357;&#2337;&#2368;&#2354; / &#2346;&#2340;&#2381;&#2344;&#2368; / &#2348;&#2361;&#2368;&#2339; / &#2349;&#2366;&#2313; &mdash;
          &#2350;&#2354;&#2366; &#2360;&#2352;&#2381;&#2357; &#2309;&#2335;&#2368; &#2350;&#2306;&#2332;&#2369;&#2352; &#2310;&#2361;&#2375;&#2340;.
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:28px;font-weight:800;font-size:12px;color:#000;font-family:Arial, sans-serif;">
        <div style="text-align:center;width:28%;">
          <div style="border-top:1.5px solid #000;margin-bottom:4px;"></div>
          Parent's Sign.
        </div>
        <div style="text-align:center;width:28%;">
          <div style="border-top:1.5px solid #000;margin-bottom:4px;"></div>
          Student Sign.
        </div>
        <div style="text-align:center;width:34%;">
          <div style="border-top:1.5px solid #000;margin-bottom:4px;"></div>
          Authorised Sign./Stamp
        </div>
      </div>
    </div>

  </div>

  <!-- PAGE 2: UNDER TAKING -->
  <div class="sheet">

    <!-- Header -->
    <div style="display:flex;align-items:center;gap:14px;padding-bottom:12px;margin-bottom:6px;position:relative;z-index:2;">
      <img src="${logoBase64}" alt="Logo" style="width:84px;height:84px;border-radius:50%;border:2px solid #14507a;object-fit:cover;flex-shrink:0;" />
      <div style="flex-grow:1;">
        <div style="color:#0b5175;font-size:23px;font-weight:900;letter-spacing:0.3px;line-height:1.2;font-family:'Arial Black', Impact, Arial, sans-serif;">TRUSTCARE INSTITUTE OF HEALTH SCIENCE</div>
        <div style="font-weight:700;font-size:11.5px;color:#000;margin-top:5px;display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
          <span>Email: trustcareinstitute03@gmail.com</span>
          <span style="color:#555;">|</span>
          <span style="display:flex;align-items:center;gap:4px;">
            <span style="background-color:#d32f2f;color:white;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:11px;">&#9742;</span> +91 9967340243
          </span>
          <span style="color:#555;">|</span>
          <span style="display:flex;align-items:center;gap:4px;">
            <span style="background-color:#d32f2f;color:white;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:11px;">&#9742;</span> +91 9967288158
          </span>
        </div>
      </div>
    </div>

    <!-- Title Banner -->
    <div style="background:#14507a;color:#fff;text-align:center;font-weight:900;font-size:18px;padding:8px 0;margin-bottom:18px;clip-path:polygon(15px 0%, 100% 0%, calc(100% - 15px) 100%, 0% 100%);letter-spacing:1.5px;max-width:320px;margin-left:auto;margin-right:auto;position:relative;z-index:2;">
      &#2361;&#2350;&#2368; &#2346;&#2340;&#2381;&#2352; / UNDER TAKING
    </div>

    <div style="position:relative;z-index:2;">
      <!-- Marathi Points -->
      <div style="margin-bottom:10px;">
        ${mrPoints
          .map(
            (p, i) => `
        <div style="display:flex;align-items:flex-start;gap:8px;font-weight:700;font-style:italic;font-size:11px;line-height:1.5;margin-bottom:3px;color:#000;">
          <span style="flex-shrink:0;font-weight:900;color:#14507a;min-width:18px;">${i + 1}.</span><span>${p}</span>
        </div>`
          )
          .join("")}
      </div>

      <div style="border-top:1.5px dashed #aaa;margin:10px 0;"></div>

      <!-- English Points -->
      <div>
        ${enPoints
          .map(
            (p, i) => `
        <div style="display:flex;align-items:flex-start;gap:8px;font-weight:700;font-size:11px;line-height:1.5;margin-bottom:3px;color:#000;">
          <span style="flex-shrink:0;font-weight:900;color:#14507a;min-width:18px;">${i + 1}.</span><span>${p}</span>
        </div>`
          )
          .join("")}
      </div>
    </div>

    <!-- Pinned bottom section: guardian declaration + signatures -->
    <div class="bottom-section">
      <div style="border-top:1.5px solid #000;padding-top:8px;">
        <!-- English declaration -->
        <div style="font-size:12px;font-weight:700;line-height:1.6;margin-bottom:4px;color:#000;">
          I Am Mr./Ms : <span style="border-bottom:1.5px solid #000;display:inline-block;min-width:160px;padding:0 4px;font-weight:700;">&nbsp;${data.guardianName || ""}</span>
          &nbsp;Mother / Father / Husband / Sister / Brother of
          <span style="border-bottom:1.5px solid #000;display:inline-block;min-width:140px;padding:0 4px;font-weight:700;">&nbsp;${data.studentName}</span>
          &nbsp;&#8212; I Agree with Terms And Condition.
        </div>
        <!-- Marathi declaration -->
        <div style="font-size:12px;font-weight:800;color:#000;line-height:1.6;font-family:Arial, sans-serif;">
          &#2350;&#2368; &#2358;&#2381;&#2352;&#2368;/ &#2358;&#2381;&#2352;&#2368;&#2350;&#2340;&#2368; <span style="border-bottom:1.5px solid #000;display:inline-block;min-width:130px;padding:0 4px;font-weight:700;">&nbsp;${data.guardianName || ""}&nbsp;</span>
          ,&nbsp;<span style="border-bottom:1.5px solid #000;display:inline-block;min-width:110px;padding:0 4px;font-weight:700;">&nbsp;${data.guardianRelation || ""}&nbsp;</span>
          &#2310;&#2312;/&#2357;&#2337;&#2368;&#2354;/&#2346;&#2340;&#2368;/&#2348;&#2361;&#2368;&#2339;/&#2349;&#2366;&#2313; &mdash; &#2350;&#2354;&#2366; &#2360;&#2352;&#2381;&#2357; &#2309;&#2335;&#2368; &#2350;&#2306;&#2332;&#2369;&#2352; &#2310;&#2361;&#2375;&#2340;.
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:28px;font-weight:800;font-size:12px;color:#000;font-family:Arial, sans-serif;">
        <div style="text-align:center;width:28%;">
          <div style="border-top:1.5px solid #000;margin-bottom:4px;"></div>
          Parent's Sign.
        </div>
        <div style="text-align:center;width:28%;">
          <div style="border-top:1.5px solid #000;margin-bottom:4px;"></div>
          Student Sign.
        </div>
        <div style="text-align:center;width:34%;">
          <div style="border-top:1.5px solid #000;margin-bottom:4px;"></div>
          Authorised Sign./Stamp
        </div>
      </div>
    </div>

  </div>

  </div>
</body>
</html>`;

  const popW = 794;
  const popH = Math.min(screen.availHeight || 900, 1123);
  const left = Math.max(0, Math.round((screen.width - popW) / 2));
  const top = Math.max(0, Math.round((screen.height - popH) / 2));
  const printWindow = window.open("", "_blank", `width=${popW},height=${popH},left=${left},top=${top},scrollbars=yes`);
  if (printWindow) {
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
  } else {
    alert("Popup blocked! Please allow popups to view the receipt.");
  }
}
