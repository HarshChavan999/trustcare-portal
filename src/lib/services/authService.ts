import { auth, db } from "../firebase";
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  createUserWithEmailAndPassword
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";

export interface UserProfile {
  uid: string;
  email: string;
  username: string;
  role: "admin" | "staff";
  branch: string;
}

// Convert a username to a standardized email for Firebase Auth
export function usernameToEmail(username: string): string {
  return `${username.toLowerCase().trim()}@trustcare.com`;
}

// Seed default users if the collection is empty
export async function seedDefaultUsers() {
  try {
    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);
    if (snapshot.empty) {
      console.log("Seeding default users...");
      const defaultUsers = [
        { username: "admin", password: "Password123", role: "admin" },
        { username: "staff", password: "Password123", role: "staff" }
      ];

      for (const user of defaultUsers) {
        const email = usernameToEmail(user.username);
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, user.password);
          const uid = userCredential.user.uid;
          await setDoc(doc(db, "users", uid), {
            uid,
            email,
            username: user.username,
            role: user.role,
            branch: "main",
            instituteName: "Shelar Training Institute",
            createdAt: new Date()
          });
          console.log(`Created user: ${user.username}`);
        } catch (authError: any) {
          if (authError.code === "auth/email-already-in-use") {
            console.log(`User ${user.username} already exists in Firebase Auth.`);
          } else {
            console.error(`Failed to create auth user ${user.username}:`, authError);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error seeding default users:", error);
  }
}

// Update user profile in Firestore
export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<boolean> {
  try {
    await setDoc(doc(db, "users", uid), data, { merge: true });
    return true;
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}

// Login a user and retrieve their Firestore profile
export async function loginUser(username: string, password: string): Promise<UserProfile> {
  const email = username.includes("@") ? username : usernameToEmail(username);

  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const uid = userCredential.user.uid;

  const userDoc = await getDoc(doc(db, "users", uid));
  if (!userDoc.exists()) {
    const defaultProfile: UserProfile = {
      uid,
      email,
      username: username.split("@")[0],
      role: "admin",
      branch: "main"
    };
    await setDoc(doc(db, "users", uid), defaultProfile);
    return defaultProfile;
  }

  return userDoc.data() as UserProfile;
}

// Sign out from the application
export async function logoutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

// Subscribe to auth state changes
export function subscribeToAuth(callback: (user: FirebaseUser | null, profile: UserProfile | null) => void) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        callback(user, userDoc.data() as UserProfile);
      } else {
        callback(user, {
          uid: user.uid,
          email: user.email || "",
          username: (user.email || "").split("@")[0],
          role: "admin",
          branch: "main"
        });
      }
    } else {
      callback(null, null);
    }
  });
}