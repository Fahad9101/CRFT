// firebase.js (FINAL ROLE-STRUCTURED VERSION)

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

// ============================
// FIREBASE CONFIG
// ============================

const firebaseConfig = {
  apiKey: "AIzaSyBz00_ifpMM2tbRBILZVU-cEvfiBqTCRMI",
  authDomain: "crft-c9f31.firebaseapp.com",
  projectId: "crft-c9f31",
  storageBucket: "crft-c9f31.appspot.com",
  messagingSenderId: "337127729938",
  appId: "1:337127729938:web:4e44f6a65050c3d5ace1cb",
  measurementId: "G-G1NBRQ5G9",
};

// Prevent duplicate init
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// ============================
// AUTH
// ============================

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

// ============================
// COLLECTIONS
// ============================

export const COLLECTIONS = {
  sessionConfig: "crft_session_config",
  submissions: "crft_submissions",
  activations: "crft_activations",
};

// ============================
// SESSION CONFIG
// ============================

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

// ============================
// SUBMISSIONS
// ============================

export async function createSubmission(record) {
  const id = `${record.sessionCode}_${record.sessionDay}_${record.residentId}`;

  await setDoc(doc(db, COLLECTIONS.submissions, id), {
    ...record,
    createdAt: serverTimestamp(),
  });

  return { id };
}

// 🔥 IMPORTANT: manual evaluation saved here
export async function updateSubmissionManual(id, payload) {
  const ref = doc(db, COLLECTIONS.submissions, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  await setDoc(
    ref,
    {
      ...snap.data(),
      ...payload,
      manualUpdatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
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

export async function deleteSubmissionById(id) {
  await deleteDoc(doc(db, COLLECTIONS.submissions, id));
}

// ============================
// ACTIVATION SYSTEM (CASE-LEVEL)
// ============================

// generate code
export function generateActivationCode(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

// create ONE code per case/day
export async function createActivation(payload) {
  const id = `${payload.sessionCode}_${payload.sessionDay}_${payload.caseId}`;

  await setDoc(doc(db, COLLECTIONS.activations, id), {
    ...payload,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return { id };
}

// listen
export function subscribeToActivations(callback) {
  const q = query(
    collection(db, COLLECTIONS.activations),
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

// validate access
export async function validateActivation({
  residentId,
  activationCode,
  sessionDay,
  caseId,
}) {
  const snap = await getDocs(collection(db, COLLECTIONS.activations));

  const rows = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));

  const found = rows.find(
    (r) =>
      String(r.activationCode || "").toUpperCase() ===
        String(activationCode || "").toUpperCase() &&
      Number(r.sessionDay) === Number(sessionDay) &&
      r.caseId === caseId
  );

  if (!found) return { ok: false, message: "No matching activation found." };
  if (!found.isActive)
    return { ok: false, message: "Activation is inactive." };

  if (!(found.allowedResidentIds || []).includes(residentId))
    return { ok: false, message: "Resident not allowed." };

  if ((found.usedResidentIds || []).includes(residentId))
    return { ok: false, message: "Already used by this resident." };

  return { ok: true, activation: found };
}

// mark usage PER resident
export async function markActivationUsed(id, residentId) {
  const ref = doc(db, COLLECTIONS.activations, id);
  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const data = snap.data();

  const usedResidentIds = Array.from(
    new Set([...(data.usedResidentIds || []), residentId])
  );

  const allowed = data.allowedResidentIds || [];

  const allUsed =
    allowed.length > 0 &&
    allowed.every((r) => usedResidentIds.includes(r));

  await setDoc(
    ref,
    {
      ...data,
      usedResidentIds,
      isActive: !allUsed,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}
