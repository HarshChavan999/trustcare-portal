# Installment Schedule Table Generation Workflow

## Overview
The installment schedule table generation system in the Course Payment module is a complex workflow that handles different payment types (Full, Partial, EMI) and generates interactive tables showing installment details, due dates, amounts, and payment status.

## Key Functions and Their Roles

### Frontend Functions (CoursePayment.html)

#### 1. `generateInstallmentScheduleForPaymentType(paymentType, totalFee)`
**Purpose**: Creates the initial installment schedule based on selected payment type
**Input**: paymentType ('full'|'partial'|'emi'), totalFee (number)
**Output**: Array of installment objects

**Logic Flow**:
- **Full Payment**: Creates single installment with full amount due immediately
- **Partial Payment**: Creates initial payment + multiple EMIs (initial payment = 50% of total, remaining divided by tenure-1)
- **EMI Payment**: Creates down payment + multiple equal EMIs (down payment = user input, remaining divided by tenure)

**Data Structure**:
```javascript
{
  installmentNumber: 1,
  amount: 50000,
  dueDate: "2025-01-15",
  status: "Pending",
  type: "Initial Payment" // optional
}
```

#### 2. `populateInstallmentSchedule()`
**Purpose**: Main orchestrator function that populates the installment table
**Triggers**: Called when course payment form loads or when user comes from admission flow

**Workflow**:
1. Gets enrollment ID and receipt number identifiers
2. Checks if course details are loaded (duration, fees)
3. Loads existing server payments via `getInstallmentPaymentsForStudent()`
4. Loads saved installment schedule via `loadInstallmentSchedule()`
5. If saved schedule exists → use `generateInstallmentTableRowsFromScheduleShared()`
6. If no saved schedule → check admission data or generate default schedule
7. Populates HTML table with installment rows

#### 3. `generateInstallmentTableRowsFromScheduleShared(tableElement, schedule, paidInstallments, showCheckboxes, showReceiptButtons)`
**Purpose**: Universal table row generator used by both Course Payment and Admission Analytics
**Parameters**:
- `tableElement`: HTML table body element
- `schedule`: Array of installment objects
- `paidInstallments`: Array of paid installment data
- `showCheckboxes`: Boolean for payment checkboxes
- `showReceiptButtons`: Boolean for receipt generation buttons

**HTML Generation**:
```html
<tr>
  <td>Installment 1 (Initial Payment)</td>
  <td>2025-01-15</td>
  <td>₹25,000</td>
  <td><span class="status">Paid</span></td>
  <td><input type="checkbox" checked disabled></td>
  <td><button onclick="generateInstallmentReceipt(1, 25000)">Receipt</button></td>
</tr>
```

#### 4. `handlePaymentConfirmation(checkbox)`
**Purpose**: Processes payment option confirmation and triggers schedule generation
**Workflow**:
1. Shows confirmation dialog
2. Locks payment options (disables radio buttons and dropdowns)
3. Calculates total fee from form
4. Generates schedule using `generateInstallmentScheduleForPaymentType()`
5. Saves course payment data to FeeStructure sheet
6. Shows installment schedule section

#### 5. `handleInstallmentPayment(checkbox, statusId, receiptBtnId)`
**Purpose**: Processes individual installment payments
**Workflow**:
1. Shows confirmation dialog
2. Calls `ensureInstallmentScheduleSaved()` to save schedule if needed
3. Calls `saveInstallmentPayment()` to record payment
4. Updates FeeStructure (reduces Course_Fee_Due)
5. Updates UI (status, checkbox, receipt button)

### Backend Functions (Code.js)

#### 6. `saveInstallmentSchedule(data)`
**Purpose**: Persists installment schedule to Google Sheets
**Sheets**: InstallmentSchedules
**Data Saved**:
- Timestamp, Enrollment_ID, Student_Name, Course_Name
- Payment_Type, Total_Fees, Installment_Number
- Installment_Amount, Due_Date, Status, User

**Workflow**:
1. Checks for existing schedule for enrollment ID
2. Deletes old entries if updating
3. Saves new schedule entries
4. Logs audit trail

#### 7. `loadInstallmentSchedule(enrollmentId)`
**Purpose**: Retrieves saved schedule for display
**Returns**: Array of installment objects sorted by installment number
**Used By**: `populateInstallmentSchedule()` to restore user customizations

#### 8. `getInstallmentPaymentsForStudent(enrollmentId)`
**Purpose**: Gets payment history to determine paid installments
**Sheets**: InstallmentPayments
**Returns**: Array of payment records with installment numbers and amounts

#### 9. `saveInstallmentPayment(data)`
**Purpose**: Records individual installment payments
**Sheets**: InstallmentPayments (with 36 installment columns)
**Workflow**:
1. Finds/updates row for enrollment ID
2. Sets payment amount in specific installment column
3. Calculates total Amount_Paid across all installments
4. Updates FeeStructure via `updateFeeStructureAmountDue()`
5. Updates schedule status via `updateInstallmentScheduleStatus()`

#### 10. `updateInstallmentScheduleStatus(data)`
**Purpose**: Updates installment status from "Pending" to "Paid"
**Sheets**: InstallmentSchedules
**Called By**: Payment processing functions

## Complete Workflow Diagram

```
1. PAYMENT SELECTION
   User selects payment type (Full/Partial/EMI) → handlePaymentOptionChange()

2. PAYMENT CONFIRMATION
   User checks confirmation checkbox → handlePaymentConfirmation()
   ├── Shows confirmation dialog
   ├── Locks payment options
   └── Generates schedule → generateInstallmentScheduleForPaymentType()

3. SCHEDULE GENERATION
   Creates installment array based on payment type:
   ├── Full: Single installment
   ├── Partial: Initial + EMIs
   └── EMI: Down payment + EMIs

4. DATA PERSISTENCE
   ├── Saves course payment → saveCoursePayment() → FeeStructure sheet
   └── Saves installment schedule → saveInstallmentSchedule() → InstallmentSchedules sheet

5. TABLE POPULATION
   populateInstallmentSchedule() is called:
   ├── Loads server payments → getInstallmentPaymentsForStudent()
   ├── Loads saved schedule → loadInstallmentSchedule()
   └── Generates table rows → generateInstallmentTableRowsFromScheduleShared()

6. INDIVIDUAL PAYMENT PROCESSING
   User checks installment checkbox → handleInstallmentPayment()
   ├── Shows confirmation
   ├── Saves payment → saveInstallmentPayment() → InstallmentPayments sheet
   ├── Updates FeeStructure → updateFeeStructureAmountDue()
   ├── Updates schedule status → updateInstallmentScheduleStatus()
   └── Generates receipt → generateInstallmentReceipt()
```

## Data Flow Between Components

### Sheet Structure Relationships

#### FeeStructure Sheet (Main fee tracking)
- Columns: Timestamp, Enrollment_ID, Name, Course_Name, Payment_Mode, Admission_Fee, Admission_Fee_Due, Course_Fee, Course_Fee_Due, Exam_Fee, Exam_Fee_Due, Total_Amount_Due, Branch, User_Name
- **Course_Fee**: Total course fee amount (fixed)
- **Course_Fee_Due**: Remaining amount to be paid (reduced with each payment)

#### InstallmentSchedules Sheet (Schedule template)
- Stores the planned installment schedule for each enrollment
- Updated when payment status changes
- Used to restore schedule when form reloads

#### InstallmentPayments Sheet (Payment history)
- 36 installment columns (Installment_1 to Installment_36)
- Records actual payments made
- Amount_Paid column = sum of all installment payments

### Session Storage Usage
```javascript
// Stores course payment details between page transitions
sessionStorage.setItem('coursePaymentDetails', JSON.stringify({
  paymentType: 'emi',
  emiTenure: 12,
  partialTenure: 6
}));

// Stores admission data for cross-page workflow
sessionStorage.setItem('admissionDataForPayment', admissionData);
```

## Payment Type Logic

### Full Payment
- Single installment with full course fee
- Due date = Today
- Status = "Full Paid"
- No EMI installments

### Partial Payment
```javascript
const initialPayment = totalFee * 0.5; // 50% initial
const remainingAmount = totalFee - initialPayment;
const emiAmount = Math.ceil(remainingAmount / (tenure - 1));
```

### EMI Payment
```javascript
const downPayment = userInput; // User specified
const remainingAmount = totalFee - downPayment;
const emiAmount = Math.ceil(remainingAmount / tenure);
```

## Error Handling and Validation

### Form Validation
- Course selection required
- Payment type selection required
- Amount validation (integer only, no decimals)
- Receipt number generation and validation

### Payment Processing
- Duplicate payment prevention
- Amount validation before processing
- FeeStructure updates with error handling
- Audit logging for all operations

## Integration Points

### With Admission Form
- Pre-fills course payment form from admission data
- Uses sessionStorage to pass admission details
- Handles different entry points (direct access vs. from admission)

### With Fee Structure
- Updates Course_Fee_Due on each payment
- Maintains total fee tracking across all payment types
- Handles backward compatibility for existing records

### With Analytics
- Shares table generation functions with Admission Analytics
- Consistent UI and functionality across modules
- Unified payment tracking and reporting

## Key Technical Features

### Dynamic Table Generation
- Tables built entirely in JavaScript
- Responsive design with mobile compatibility
- Status indicators with color coding

### Payment State Management
- Real-time status updates
- Prevention of double payments
- Receipt generation integration

### Data Persistence
- Multiple sheet integration
- Audit trail maintenance
- Data consistency across updates

### User Experience
- Confirmation dialogs for important actions
- Visual feedback for payment status
- Seamless workflow between admission and payment
