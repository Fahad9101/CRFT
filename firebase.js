import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  getDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBz00_ifpMM2tbRBILZVU-cEvfiBqTCRMI",
  authDomain: "crft-c9f31.firebaseapp.com",
  projectId: "crft-c9f31",
  storageBucket: "crft-c9f31.appspot.com",
  messagingSenderId: "337127729938",
  appId: "1:337127729938:web:4e44f6a65050c3d5ace1cb",
  measurementId: "G-G1NBRQ5G9",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export async function ensureAnonymousAuth() {
  if (auth.currentUser) return auth.currentUser;
  const cred = await signInAnonymously(auth);
  return cred.user;
}

export function subscribeToAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function logoutFirebase() {
  await signOut(auth);
}

export const COLLECTIONS = {
  sessionConfig: "crft_session_config",
  submissions: "crft_submissions",
};

export async function saveSessionConfig(session) {
  await setDoc(
    doc(db, COLLECTIONS.sessionConfig, "active"),
    {
      ...session,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function loadSessionConfig() {
  const ref = doc(db, COLLECTIONS.sessionConfig, "active");
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export function subscribeToSessionConfig(callback) {
  const ref = doc(db, COLLECTIONS.sessionConfig, "active");

  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    callback({ id: snap.id, ...snap.data() });
  });
}

export async function createSubmission(record) {
  const id = `${record.sessionCode}_${record.sessionDay}_${record.residentId}`;

  await setDoc(doc(db, COLLECTIONS.submissions, id), {
    ...record,
    createdAt: serverTimestamp(),
  });

  return { id };
}

export function subscribeToSubmissions(callback) {
  const q = query(
    collection(db, COLLECTIONS.submissions),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const rows = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    callback(rows);
  });
}

export async function listSubmissions() {
  const q = query(
    collection(db, COLLECTIONS.submissions),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
}

export async function deleteSubmissionById(id) {
  await deleteDoc(doc(db, COLLECTIONS.submissions, id));
}

export async function getExistingSubmissionKeyMap() {
  const rows = await listSubmissions();
  const keyMap = {};

  for (const row of rows) {
    const key = `${row.sessionCode}-${row.sessionDay}-${row.residentId}`;
    keyMap[key] = row.id;
  }

  return keyMap;
}
