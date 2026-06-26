# Implementation Tasks for Admission Receipt Workflow

## Analysis Phase
- [x] Analyze current `Code.js` functions: `InquiryProcessForm`, `saveToSheet`, `saveCoursePayment`, `generateReceipt`
- [x] Review `sessionStorage` data flow between forms (`copyInquiry`, `copyAdmission`)
- [x] Examine receipt generation logic in `admissionreceipt.html` and related files
- [x] Identify all required columns for "AdmissionReceipts" sheet (inquiry + admission + course payment + consent data)

## Sheet Creation
- [ ] Create "AdmissionReceipts" Google Sheet if it doesn't exist
- [ ] Define column structure for AdmissionReceipts sheet:
  - Inquiry data fields
  - Admission data fields
  - Course payment data
  - Consent information (guardian relation, guardian name, agreement status)
  - Receipt number, date, amounts, balance

## Server-Side Implementation
- [ ] Add `saveAdmissionReceipt()` function to `Code.js`
- [ ] Implement logic to append data to "AdmissionReceipts" sheet
- [ ] Add receipt number auto-generation logic (sequential numbering)

## Receipt Generation Modifications
- [ ] Modify `generateReceipt()` function to call `saveAdmissionReceipt()` before PDF generation
- [ ] Update `generateReceipt()` to gather complete session data from `sessionStorage`
- [ ] Pre-fill receipt with combined workflow data:
  - Full Name from admission form
  - Course Name from "Propose to Pay" field
  - Receipt No: auto-generated
  - Date: current date
  - Total Amount from course payment
  - Paid amount
  - Balance calculation

## Data Flow Enhancement
- [ ] Enhance `sessionStorage` in `copyAdmission()` to include all necessary fields for receipt pre-filling
- [ ] Ensure session data spans complete workflow: inquiry → admission → course payment → receipt
- [ ] Add missing fields to sessionStorage (guardian relation, guardian name, agreement status)

## Receipt Pre-filling Details
- [ ] Implement Guardian Consent text: "I am [relation] of [guardian_name]"
- [ ] Pre-fill "Propose to Pay" field with course name from payment data
- [ ] Ensure receipt number field is populated with generated number
- [ ] Calculate and display balance (Total Amount - Paid)

## Testing and Validation
- [ ] Test complete workflow from inquiry form to receipt generation
- [ ] Verify data persistence in AdmissionReceipts sheet
- [ ] Validate receipt number uniqueness and sequential generation
- [ ] Confirm all fields are properly pre-filled in receipt PDF

## Error Handling and Edge Cases
- [ ] Add error handling for AdmissionReceipts sheet creation/access
- [ ] Handle cases where session data might be incomplete
- [ ] Implement validation for receipt number generation
- [ ] Add logging for debugging workflow issues
