# Admission Receipt Data Flow Workflow

## Overview
This document explains the complete workflow for populating the Admission Receipt form, focusing on how student name and other data fields are shared across forms.

## Sample Input Data
Let's use this sample student data throughout the workflow:

**Student Details:**
- First Name: "Rajesh"
- Middle Name: "Kumar"
- Last Name: "Sharma"
- Course: "ANM Nursing Diploma"
- Guardian: "Ravi Sharma" (Father)
- Receipt No: "AR-12345"

## Workflow Steps

### 1. Inquiry Form (Inquiry.html)
**Data Entry:**
```javascript
// From InquiryForm/Inquiry.html - Student enters basic info
<input id="firstName" value="Rajesh">
<input id="middleName" value="Kumar">
<input id="lastName" value="Sharma">
<select id="interestedCourse" value="anm_nursing">
```

**Data Storage (copyInquiry function in script.html):**
```javascript
sessionStorage.setItem("tempText", "Rajesh");     // first name copy
sessionStorage.setItem("tempTextMiddle", "Kumar"); // middle name copy
sessionStorage.setItem("tempTextLast", "Sharma");  // last name copy
sessionStorage.setItem("tempText2", "anm_nursing"); // course copy
```

### 2. Admission Form (Admission.html)
**Data Transfer (NEXT button onmouseover - copyAdmission in script.html):**
```javascript
function copyAdmission(){
    // Builds full name from sessionStorage
    let firstName = sessionStorage.getItem('tempText');      // "Rajesh"
    let middleName = sessionStorage.getItem('middle_name');  // Will be null initially
    let lastName = sessionStorage.getItem('tempTextLast');   // "Sharma"
    let fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');
    // Result: "Rajesh Sharma"

    let nameElement = document.getElementById("std_Coursepayname");
    if (nameElement) {
      nameElement.value = fullName.trim(); // Populates Course Payment student name
    }

    // Stores complete admission data
    const admissionData = {
      firstName: "Rajesh",
      middleName: "",           // From admission form input
      lastName: "Sharma",
      studentName: "Rajesh Sharma", // Complete built name
      guardianName: "Ravi Sharma",
      guardianRelation: "father",
      courseSelect: "anm_nursing",
      // ... other fields
    };
    sessionStorage.setItem('admissionData', JSON.stringify(admissionData));
}
```

**Admission Form Fields:**
```html
<input id="first_name" value="Rajesh">       <!-- From inquiry -->
<input id="middle_name">                     <!-- Can be filled here -->
<input id="last_name" value="Sharma">        <!-- From inquiry -->
<input id="guardian_name" value="Ravi Sharma">
<select id="guardian_relation" value="father">
```

### 3. Course Payment Form (CoursePayment.html)
**Data Transfer (openCoursePayment - copyAdmission called in setTimeout):**
```javascript
function openCoursePayment() {
    setTimeout(() => {
        // Transfers data from admission to course payment
        let firstName = sessionStorage.getItem('first_name');  // "Rajesh"
        let middleName = sessionStorage.getItem('middle_name'); // Potentially "Kumar" here
        let lastName = sessionStorage.getItem('last_name');   // "Sharma"
        let fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');

        document.getElementById("std_Coursepayname").value = fullName;
        // Populates: std_Coursepayname = "Rajesh Kumar Sharma"
    }, 100);
}
```

**Course Payment Form Fields:**
```html
<input id="std_Coursepayname" value="Rajesh Kumar Sharma"> <!-- Full name -->
<input id="ID" value="AR-12345">                          <!-- Receipt number -->
```

### 4. Proceed to Admission Receipt (CoursePayment.html)
**Data Preparation (proceedToAdmissionReceipt function):**
```javascript
function proceedToAdmissionReceipt() {
    // Retrieves all previous data
    const admissionData = JSON.parse(sessionStorage.getItem('admissionData') || '{}');
    // admissionData = {firstName: "Rajesh", middleName: "Kumar", lastName: "Sharma", studentName: "Rajesh Kumar Sharma", ...}

    const inquiryData = JSON.parse(sessionStorage.getItem('inquiryDataForAdmission') || '{}');

    // PRIORITY STUDENT NAME CONSTRUCTION:
    let studentName = "";
    if (admissionData.studentName && admissionData.studentName.trim() !== "") {
      studentName = admissionData.studentName;  // Priority 1: Complete studentName
    } else if (admissionData.firstName || admissionData.lastName) {
      // Priority 2: Build from individual parts
      const firstName = admissionData.firstName || "";
      const middleName = admissionData.middleName || "";
      const lastName = admissionData.lastName || "";
      studentName = [firstName, middleName, lastName].filter(Boolean).join(" ");
    } else if (inquiryData.firstName || inquiryData.lastName) {
      // Priority 3: Fallback to inquiry data
      const firstName = inquiryData.firstName || "";
      const middleName = inquiryData.middleName || "";
      const lastName = inquiryData.lastName || "";
      studentName = [firstName, middleName, lastName].filter(Boolean).join(" ");
    }

    // Result for sample: "Rajesh Kumar Sharma"

    // Creates complete receipt data object
    const completeReceiptData = {
      receiptNo: "AR-12345",
      studentName: "Rajesh Kumar Sharma",  // BUILT NAME
      courseName: "anm_nursing",
      guardianName: "Ravi Sharma",
      studentRelation: "father",
      // ... other merged fields
    };

    // Stores for receipt form
    sessionStorage.setItem('completeReceiptData', JSON.stringify(completeReceiptData));
    openreceiptFormSection();
}
```

### 5. Admission Receipt Form (AdmissionFormReceipt.html)
**Final Data Population (prefillAdmissionReceipt function):**
```javascript
function prefillAdmissionReceipt(completeReceiptData) {
    console.log("Prefilling with:", completeReceiptData);
    // completeReceiptData = {studentName: "Rajesh Kumar Sharma", ...}

    // POPULATES THE INPUT FIELD WE NEEDED
    document.getElementById("studentName").value = completeReceiptData.studentName || "";
    // Result: <input id="studentName" value="Rajesh Kumar Sharma">

    // Also populates other fields
    document.getElementById("guardianName").value = completeReceiptData.guardianName || "";
    document.getElementById("studentRelation").value = completeReceiptData.studentRelation || "";
    // Result: "Ravi Sharma" and "Father"
}
```

## Data Flow Priority

1. **Admission Form Complete Name** (`admissionData.studentName`) - Highest priority
2. **Admission Form Parts** (`firstName + middleName + lastName`) - Second priority
3. **Inquiry Form Data** (`inquiryData firstName/middleName/lastName`) - Third priority
4. **Course Payment Form** (`std_Coursepayname.value`) - Final fallback

## Key Code Changes Made

**In `script.html` - copyAdmission function:**
```javascript
// OLD: Didn't include middle name
let fullName = firstName + ' ' + lastName;

// NEW: Includes middle name
let fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');
```

**In `CoursePayment.html` - proceedToAdmissionReceipt function:**
```javascript
// Added proper priority-based student name construction with middle name handling
let studentName = "";
if (admissionData.studentName && admissionData.studentName.trim() !== "") {
  studentName = admissionData.studentName;
} else if (admissionData.firstName || admissionData.lastName) {
  // Build with middle name
  studentName = [firstName, middleName, lastName].filter(Boolean).join(" ");
}
// ... fallbacks
```

## Final Result

The input `<input type="text" id="studentNameAF" name="studentNameAF" style="width: 100%">` in the main admission receipt now gets the value "Rajesh Kumar Sharma" as expected.

**ID Update:** To avoid conflicts with duplicate IDs across different forms, all IDs and names in the Admission Receipt form have been suffixed with "AF" (Admission Form). For example:
- `id="studentName"` → `id="studentNameAF"`
- `id="receiptDate"` → `id="receiptDateAF"`
- `id="receiptNo"` → `id="receiptNoAF"`
- Photo upload elements also renamed accordingly

## JavaScript Functions Updated:
- `handlePhotoUpload()` → `handlePhotoUploadAF()`
- PDF generation updated to use `document.getElementById('studentNameAF')`
- Prefill function updated to use `document.getElementById("studentNameAF").value`
