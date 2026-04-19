// firebase.js (FINAL LOCKED VERSION – COMPATIBLE WITH YOUR CURRENT APP)

import { initializeApp, getApps } from "firebase/app"
import {
  getAuth,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth"

import {
  getFirestore,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  setDoc,
} from "firebase/firestore"

// ============================
// FIREBASE CONFIG (YOUR REAL CONFIG)
// ============================

const firebaseConfig = {
  apiKey: "AIzaSyBz00_ifpMM2tbRBILZVU-cEvfiBqTCRMI",
  authDomain: "crft-c9f31.firebaseapp.com",
  projectId: "crft-c9f31",
  storageBucket: "crft-c9f31.appspot.com",
  messagingSenderId: "337127729938",
  appId: "1:337127729938:web:4e44f6a65050c3d5ace1cb",
  measurementId: "G-G1NBRQ5G9",
}

// Prevent duplicate initialization
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)

// ============================
// AUTH
// ============================

export const signInResident = async () => {
  return await signInAnonymously(auth)
}

export const signInEvaluator = async (email, password) => {
  return await signInWithEmailAndPassword(auth, email, password)
}

export const logOut = async () => {
  return await signOut(auth)
}

export const watchAuth = (callback) => {
  return onAuthStateChanged(auth, callback)
}

// ============================
// EVALUATIONS (CORE DATASET)
// 🔒 LOCKED + NO DUPLICATES
// ============================

const evaluationsCollection = "crft_submissions"

// 🔴 KEY CHANGE: deterministic ID (prevents duplicates + matches rules)
export const createEvaluation = async (data) => {
  const id = `${data.sessionCode}_${data.sessionDay}_${data.residentId}`

  await setDoc(doc(db, evaluationsCollection, id), {
    ...data,
    createdAt: serverTimestamp(),
  })

  return { id }
}

// ============================
// REALTIME SUBSCRIPTIONS
// ============================

export const subscribeEvaluations = (callback) => {
  const q = query(
    collection(db, evaluationsCollection),
    orderBy("createdAt", "desc")
  )

  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    callback(data)
  })
}

// ============================
// DELETE (WILL BE BLOCKED BY RULES)
// ============================

export const removeEvaluation = async (id) => {
  const ref = doc(db, evaluationsCollection, id)
  return await deleteDoc(ref)
}

// ============================
// SESSION CONFIG (CONTROL PANEL)
// ============================

const sessionRef = doc(db, "crft_session_config", "active")

export const subscribeSessionConfig = (callback) => {
  return onSnapshot(sessionRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data())
    } else {
      callback(null)
    }
  })
}

export const saveSessionConfig = async (data) => {
  return await setDoc(
    sessionRef,
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}
