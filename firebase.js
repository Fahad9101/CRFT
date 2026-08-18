// firebase.js (FINAL ROLE-STRUCTURED VERSION)

import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup,
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
  writeBatch,
  runTransaction,
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

export async function signInStaff() {
  const credential = await signInWithPopup(auth, new GoogleAuthProvider());
  const staffDocumentId = credential.user.email || credential.user.uid;
  const roleSnap = await getDoc(doc(db, "crft_staff", staffDocumentId));
  const role = roleSnap.exists() ? roleSnap.data().role : null;
  if (!['admin', 'evaluator', 'programDirector'].includes(role)) {
    await signOut(auth);
    throw new Error('This account is not authorized for CRFT staff access.');
  }
  return { user: credential.user, role };
}

export async function getCurrentStaffRole() {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) return null;
  const roleSnap = await getDoc(doc(db, "crft_staff", user.email || user.uid));
  return roleSnap.exists() ? roleSnap.data().role : null;
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
  activationAccess: "crft_activation_access",
};

async function activationAccessId({ sessionCode, sessionDay, caseId, activationCode }) {
  const normalized = [sessionCode, sessionDay, caseId, String(activationCode || "").trim().toUpperCase()].join("|");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function accessPayload(payload, id) {
  return {
    activationAccessId: id,
    activationId: `${payload.sessionCode}_${payload.sessionDay}_${payload.caseId}`,
    sessionCode: payload.sessionCode,
    sessionDay: Number(payload.sessionDay),
    caseId: payload.caseId,
    allowedResidentIds: payload.allowedResidentIds || [],
    usedResidentIds: payload.usedResidentIds || [],
    isActive: payload.isActive !== false,
    updatedAt: new Date().toISOString(),
  };
}

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
  const accessId = await activationAccessId(payload);
  const batch = writeBatch(db);
  batch.set(doc(db, COLLECTIONS.activations, id), {
    ...payload,
    activationAccessId: accessId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  batch.set(doc(db, COLLECTIONS.activationAccess, accessId), accessPayload(payload, accessId));
  await batch.commit();
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
    ensureActivationAccessDocs(rows).catch(console.error);
    callback(rows);
  });
}

async function ensureActivationAccessDocs(rows) {
  if (!rows.length) return;
  const batch = writeBatch(db);
  for (const row of rows) {
    if (!row.activationCode) continue;
    const id = await activationAccessId(row);
    batch.set(doc(db, COLLECTIONS.activationAccess, id), accessPayload(row, id), { merge: true });
    if (row.activationAccessId !== id) {
      batch.set(doc(db, COLLECTIONS.activations, row.id), { activationAccessId: id }, { merge: true });
    }
  }
  await batch.commit();
}

// validate access
export async function validateActivation({
  residentId,
  activationCode,
  sessionDay,
  caseId,
}) {
  const activeSession = await getDoc(doc(db, COLLECTIONS.sessionConfig, "active"));
  if (!activeSession.exists() || !activeSession.data().isOpen) {
    return { ok: false, message: "The CRFT session is closed." };
  }
  const sessionCode = activeSession.data().sessionCode;
  const id = await activationAccessId({ sessionCode, sessionDay, caseId, activationCode });
  const snap = await getDoc(doc(db, COLLECTIONS.activationAccess, id));
  if (!snap.exists()) {
    // Bootstrap compatibility: this path is available only before the restrictive
    // rules are deployed. It keeps an active study working while existing codes
    // are migrated to hashed access documents by the first administrator login.
    try {
      const legacySnap = await getDocs(collection(db, COLLECTIONS.activations));
      const legacy = legacySnap.docs.map((entry) => ({ id: entry.id, ...entry.data() })).find((row) =>
        String(row.activationCode || "").trim().toUpperCase() === String(activationCode || "").trim().toUpperCase()
        && Number(row.sessionDay) === Number(sessionDay)
        && row.caseId === caseId
      );
      if (legacy) {
        if (!legacy.isActive) return { ok: false, message: "Activation is inactive." };
        if (!(legacy.allowedResidentIds || []).includes(residentId)) return { ok: false, message: "Resident not allowed." };
        if ((legacy.usedResidentIds || []).includes(residentId)) return { ok: false, message: "Already used by this resident." };
        return { ok: true, activation: { ...legacy, legacy: true } };
      }
    } catch {
      // Expected after secure rules deny resident collection queries.
    }
    return { ok: false, message: "No matching activation found." };
  }
  const found = { id, ...snap.data() };
  if (!found.isActive) return { ok: false, message: "Activation is inactive." };
  if (!(found.allowedResidentIds || []).includes(residentId)) return { ok: false, message: "Resident not allowed." };
  if ((found.usedResidentIds || []).includes(residentId)) return { ok: false, message: "Already used by this resident." };
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

export async function submitResidentRecord(record, access) {
  if (!auth.currentUser?.isAnonymous || !access?.id) throw new Error("Resident access is required.");
  if (access.legacy) {
    await createSubmission(record);
    await markActivationUsed(access.id, record.residentId);
    return { ok: true };
  }
  const accessRef = doc(db, COLLECTIONS.activationAccess, access.id);
  const activationRef = doc(db, COLLECTIONS.activations, access.activationId);
  const submissionId = `${access.sessionCode}_${access.sessionDay}_${record.residentId}`;
  const submissionRef = doc(db, COLLECTIONS.submissions, submissionId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(accessRef);
    if (!snap.exists()) throw new Error("Activation no longer exists.");
    const current = snap.data();
    if (!current.isActive || (current.usedResidentIds || []).includes(record.residentId)) {
      throw new Error("This resident has already submitted this case.");
    }
    const usedResidentIds = Array.from(new Set([...(current.usedResidentIds || []), record.residentId]));
    const allUsed = (current.allowedResidentIds || []).length > 0
      && current.allowedResidentIds.every((id) => usedResidentIds.includes(id));
    transaction.set(submissionRef, {
      ...record,
      submissionId,
      activationAccessId: access.id,
      residentAuthUid: auth.currentUser.uid,
      createdAt: serverTimestamp(),
    });
    transaction.update(accessRef, { usedResidentIds, isActive: !allUsed, lastSubmissionId: submissionId, updatedAt: new Date().toISOString() });
    transaction.update(activationRef, { usedResidentIds, isActive: !allUsed, updatedAt: new Date().toISOString() });
  });
  return { ok: true };
}
