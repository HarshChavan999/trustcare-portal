function toggleAdmissionAnalytics() {
  hideAllSections();
  document.getElementById("admissionAnalyticsSection").classList.remove("hidden");

  google.script.run
    .withSuccessHandler(function (courseList) {
      const sel = document.getElementById("aaCourseSelect");
      sel.innerHTML = `<option value="">All Courses</option>`;
      courseList.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        sel.appendChild(opt);
      });
    })
    .getCourseListFromAdmissions();

  loadAdmissionAnalytics();
}
function getCourseListFromAdmissions() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ADMISSIONF");
  const data = sheet.getRange(2, 7, sheet.getLastRow() - 1, 1).getValues(); // Column G (Course Name)
  return [...new Set(data.flat())].filter(String);
}



function getAdmissionAnalyticsData(userRole) {
  if (!userRole || userRole.toLowerCase() !== "admin") {
    return { error: "You don't have permission to view Admission Analytics." };
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ADMISSIONF");
  if (!sheet) return { error: "ADMISSIONF sheet not found." };

  const data = sheet.getDataRange().getValues();
  let results = [];
  let totalFees = 0;
  let courseCounts = {};

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const receipt = row[1] || "";
    const name = `${row[2] || ""} ${row[3] || ""} ${row[4] || ""}`.trim();
    const course = row[5] || "";
    const duration = row[6] || "";
    const totalCourseFees = parseFloat(String(row[7]).replace(/[^\d.-]/g, "")) || 0;
    const guardianRelation = row[8] || "";
    const agreement = row[10] || "";
    const tenure = parseInt(row[11]) || 12; // Assuming tenure is in column 12 (index 11)

    results.push({
      receipt: receipt,
      name: name,
      course: course,
      duration: duration,
      totalFees: totalCourseFees,
      guardianRelation: guardianRelation,
      agreement: agreement,
      tenure: tenure
    });

    totalFees += totalCourseFees;
    courseCounts[course] = (courseCounts[course] || 0) + 1;
  }

  let topCourse = Object.keys(courseCounts).reduce((a, b) => courseCounts[a] > courseCounts[b] ? a : b, "");

  return {
    data: results,
    summary: {
      totalRecords: results.length,
      totalFees: totalFees,
      averageFees: results.length > 0 ? totalFees / results.length : 0,
      topCourse: topCourse
    }
  };
}
