import { db, storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { 
  collection, 
  query, 
  getDocs, 
  getDoc,
  doc, 
  setDoc, 
  addDoc, 
  Timestamp, 
  orderBy, 
  where,
  updateDoc,
  deleteDoc
} from "firebase/firestore";

export interface AdmissionData {
  id?: string;
  receiptNumber: string;
  enrollmentId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  studentName: string;
  photoUrl?: string;
  courseName: string;
  courseDuration: string;
  totalCourseFees: number;
  admissionFee: number;
  paymentMode: string;
  guardianRelation: string;
  guardianName: string;
  agreement: "Agreed" | "Not Agreed";
  user: string;
  date: string;
  timestamp?: any;
  branch: string;
  email?: string;
  examFee?: number;
  startingYearFee?: number;
}

// Generate the next receipt number (e.g. AR-0001, AR-0024)
export async function getNextReceiptNumber(): Promise<string> {
  try {
    const admissionsRef = collection(db, "admissions");
    const snapshot = await getDocs(admissionsRef);
    let maxNum = 0;

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const receiptNo = data.receiptNumber || "";
      const match = receiptNo.match(/^AR-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    });

    const nextNum = maxNum + 1;
    return "AR-" + String(nextNum).padStart(4, "0");
  } catch (error) {
    console.error("Error generating next receipt number:", error);
    return "AR-0001";
  }
}

// Upload a student photo to Firebase Storage
export async function uploadStudentPhoto(enrollmentId: string, file: File): Promise<string> {
  try {
    const photoRef = ref(storage, `student_photos/${enrollmentId}.jpg`);
    await uploadBytes(photoRef, file);
    const downloadUrl = await getDownloadURL(photoRef);
    return downloadUrl;
  } catch (error) {
    console.error("Error uploading student photo:", error);
    throw error;
  }
}

// Save admission and set up enrollments/feeStructures
export async function saveAdmissionData(
  formData: AdmissionData,
  photoFile?: File
): Promise<{ success: boolean; message: string }> {
  try {
    let photoUrl = formData.photoUrl || "";

    // 1. Upload photo if provided
    if (photoFile) {
      photoUrl = await uploadStudentPhoto(formData.enrollmentId, photoFile);
    }

    const completeAdmission: AdmissionData = {
      ...formData,
      photoUrl,
      timestamp: Timestamp.now()
    };

    // 2. Save Admission Document (Keyed by enrollmentId)
    await setDoc(doc(db, "admissions", formData.enrollmentId), completeAdmission);

    // 3. Save Enrollment Document
    const formattedDate = new Date().toLocaleDateString("en-GB"); // dd/mm/yyyy
    await setDoc(doc(db, "enrollments", formData.enrollmentId), {
      enrollmentId: formData.enrollmentId,
      studentName: formData.studentName,
      course: formData.courseName,
      date: formattedDate,
      status: "Active"
    });

    // 4. Save FeeStructure Document
    // Assume if a paymentMode is selected, the Admission Fee is paid (Due is 0)
    const admissionFeeDue = formData.paymentMode ? 0 : formData.admissionFee;
    await setDoc(doc(db, "feeStructures", formData.enrollmentId), {
      enrollmentId: formData.enrollmentId,
      name: formData.studentName,
      courseName: formData.courseName,
      paymentMode: formData.paymentMode || "Cash",
      admissionFee: formData.admissionFee,
      admissionFeeDue: admissionFeeDue,
      courseFee: formData.totalCourseFees,
      courseFeeDue: formData.totalCourseFees, // Initial course fee due is full course fee
      examFee: 0,
      examFeeDue: 0,
      totalAmountDue: admissionFeeDue + formData.totalCourseFees,
      branch: formData.branch,
      userName: formData.user,
      timestamp: Timestamp.now()
    });

    // 5. Update corresponding Inquiry (match by studentName)
    try {
      const inquiriesRef = collection(db, "inquiries");
      // Lookup where fullName matches studentName
      const q = query(inquiriesRef, where("fullName", "==", formData.studentName));
      const querySnapshot = await getDocs(q);
      
      for (const inquiryDoc of querySnapshot.docs) {
        await updateDoc(doc(db, "inquiries", inquiryDoc.id), {
          admissionStatus: "Admitted",
          admissionDate: formData.date
        });
      }
    } catch (inquiryErr) {
      console.warn("Could not update inquiry status:", inquiryErr);
    }

    // 6. Log Audit Trail
    try {
      await addDoc(collection(db, "auditLogs"), {
        logId: `LOG-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        userId: formData.user,
        action: "Admission Form Submission",
        timestamp: Timestamp.now(),
        details: JSON.stringify({
          enrollmentId: formData.enrollmentId,
          studentName: formData.studentName,
          receiptNumber: formData.receiptNumber
        })
      });
    } catch (auditErr) {
      console.warn("Could not write audit log:", auditErr);
    }

    return { success: true, message: "Admission completed successfully!" };
  } catch (error: any) {
    console.error("Error saving admission data:", error);
    return { success: false, message: error.message || "Failed to save data." };
  }
}

// Update admission photo URL
export async function updateAdmissionPhotoUrl(id: string, photoUrl: string) {
  try {
    await updateDoc(doc(db, "admissions", id), { photoUrl });
    return { success: true, message: "Photo updated successfully" };
  } catch (error: any) {
    console.error("Error updating photo:", error);
    return { success: false, message: error.message };
  }
}

// Get admissions analytics
export async function getAdmissionAnalytics(branchFilter?: string) {
  try {
    let q;
    if (branchFilter && branchFilter !== "all") {
      q = query(collection(db, "admissions"), where("branch", "==", branchFilter));
    } else {
      q = collection(db, "admissions");
    }

    const querySnapshot = await getDocs(q);
    const data: AdmissionData[] = [];
    let totalFees = 0;
    const courseCounts: { [key: string]: number } = {};

    querySnapshot.forEach((docSnap) => {
      const docData = docSnap.data();
      const row = { ...docData, id: docSnap.id } as AdmissionData;
      data.push(row);
      totalFees += Number(row.totalCourseFees || 0);

      const course = row.courseName;
      if (course) {
        courseCounts[course] = (courseCounts[course] || 0) + 1;
      }
    });

    // Sort in memory safely
    data.sort((a, b) => {
      const tA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp?.seconds ? a.timestamp.seconds * 1000 : (a.date ? new Date(a.date).getTime() : 0));
      const tB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp?.seconds ? b.timestamp.seconds * 1000 : (b.date ? new Date(b.date).getTime() : 0));
      return tB - tA;
    });

    let topCourse = "-";
    if (Object.keys(courseCounts).length > 0) {
      topCourse = Object.keys(courseCounts).reduce((a, b) => courseCounts[a] > courseCounts[b] ? a : b);
    }

    return {
      data,
      summary: {
        totalRecords: data.length,
        totalFees: totalFees,
        averageFees: data.length > 0 ? totalFees / data.length : 0,
        topCourse: topCourse
      }
    };
  } catch (error) {
    console.error("Error getting admission analytics:", error);
    return { data: [], summary: { totalRecords: 0, totalFees: 0, averageFees: 0, topCourse: "-" } };
  }
}

export async function deleteAdmission(admissionId: string) {
  try {
    // 1. Fetch admission document to get student details
    let admissionData: AdmissionData | null = null;
    const admissionRef = doc(db, "admissions", admissionId);
    const admissionSnap = await getDoc(admissionRef);
    
    if (admissionSnap.exists()) {
      admissionData = admissionSnap.data() as AdmissionData;
    } else {
      // Query by enrollmentId in case doc ID was different
      const q = query(collection(db, "admissions"), where("enrollmentId", "==", admissionId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        admissionData = snap.docs[0].data() as AdmissionData;
      }
    }

    const enrollmentId = admissionData?.enrollmentId || admissionId;
    const studentName = admissionData?.studentName || (admissionData ? `${admissionData.firstName || ""} ${admissionData.middleName || ""} ${admissionData.lastName || ""}`.trim() : "");
    const email = admissionData?.email?.trim();
    const firstName = admissionData?.firstName?.trim();
    const lastName = admissionData?.lastName?.trim();

    // 2. Delete admission document
    await deleteDoc(admissionRef);
    if (enrollmentId !== admissionId) {
      try {
        await deleteDoc(doc(db, "admissions", enrollmentId));
      } catch (_) {}
    }

    // 3. Delete Fee Structure (Removes student from Fees and Due Fees lists)
    try {
      await deleteDoc(doc(db, "feeStructures", enrollmentId));
      if (admissionId !== enrollmentId) {
        await deleteDoc(doc(db, "feeStructures", admissionId));
      }
    } catch (feeErr) {
      console.warn("Could not delete fee structure:", feeErr);
    }

    // 4. Delete Installment Schedules & Installment Payments
    try {
      await deleteDoc(doc(db, "installmentSchedules", enrollmentId));
      await deleteDoc(doc(db, "installmentPayments", enrollmentId));
      if (admissionId !== enrollmentId) {
        await deleteDoc(doc(db, "installmentSchedules", admissionId));
        await deleteDoc(doc(db, "installmentPayments", admissionId));
      }
    } catch (instErr) {
      console.warn("Could not delete installment data:", instErr);
    }

    // 5. Delete Exam Receipts for this student
    try {
      const examQ = query(collection(db, "examReceipts"), where("enrollmentId", "==", enrollmentId));
      const examSnap = await getDocs(examQ);
      for (const exDoc of examSnap.docs) {
        await deleteDoc(doc(db, "examReceipts", exDoc.id));
      }
    } catch (examErr) {
      console.warn("Could not delete exam receipts:", examErr);
    }

    // 6. Delete Enrollment document
    try {
      await deleteDoc(doc(db, "enrollments", enrollmentId));
      if (admissionId !== enrollmentId) {
        await deleteDoc(doc(db, "enrollments", admissionId));
      }
    } catch (enrErr) {
      console.warn("Could not delete enrollment doc:", enrErr);
    }

    // 7. Delete corresponding Inquiry record(s) for this student
    try {
      const inquiriesRef = collection(db, "inquiries");
      const matchedInquiryDocIds = new Set<string>();

      // Lookup by studentName / fullName
      if (studentName) {
        const qName = query(inquiriesRef, where("fullName", "==", studentName));
        const snapName = await getDocs(qName);
        snapName.forEach((d) => matchedInquiryDocIds.add(d.id));
      }

      // Lookup by firstName and lastName
      if (firstName && lastName) {
        const qFirstLast = query(inquiriesRef, where("firstName", "==", firstName), where("lastName", "==", lastName));
        const snapFirstLast = await getDocs(qFirstLast);
        snapFirstLast.forEach((d) => matchedInquiryDocIds.add(d.id));
      }

      // Lookup by email if present
      if (email) {
        const qEmail = query(inquiriesRef, where("email", "==", email));
        const snapEmail = await getDocs(qEmail);
        snapEmail.forEach((d) => matchedInquiryDocIds.add(d.id));
      }

      // Delete all matched inquiry documents
      for (const inqId of matchedInquiryDocIds) {
        await deleteDoc(doc(db, "inquiries", inqId));
      }
    } catch (inqErr) {
      console.warn("Could not delete associated inquiry:", inqErr);
    }

    // 8. Delete Student Photo from Firebase Storage if exists
    try {
      const photoRef = ref(storage, `student_photos/${enrollmentId}.jpg`);
      await deleteObject(photoRef);
    } catch (_) {
      // Ignore if photo doesn't exist
    }

    // 9. Log Audit Trail
    try {
      await addDoc(collection(db, "auditLogs"), {
        logId: `LOG-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        userId: "Admin",
        action: "Admission and Associated Records Deleted (Cascaded)",
        timestamp: Timestamp.now(),
        details: JSON.stringify({
          admissionId,
          enrollmentId,
          studentName
        })
      });
    } catch (_) {}

    return { success: true, message: "Student admission, inquiry, fees, and due fees records deleted successfully" };
  } catch (error: any) {
    console.error("Error cascading delete for admission:", error);
    return { success: false, message: error.message };
  }
}

export async function updateAdmissionEmail(admissionId: string, email: string) {
  try {
    await updateDoc(doc(db, "admissions", admissionId), { email: email.trim() });
    return { success: true, message: "Email updated successfully" };
  } catch (error: any) {
    console.error("Error updating admission email:", error);
    return { success: false, message: error.message || "Failed to update email" };
  }
}

