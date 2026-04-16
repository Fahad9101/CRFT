// firebase.js (clean + complete)

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
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  setDoc,
  getDoc,
} from "firebase/firestore"

// 🔴 PUT YOUR REAL CONFIG HERE
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "XXXX",
  appId: "XXXX",
}

// جلوگیری من التهيئة المكررة
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)

const auth = getAuth(app)
const db = getFirestore(app)

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
// EVALUATIONS
// ============================

const evaluationsRef = collection(db, "evaluations")

export const createEvaluation = async (data) => {
  return await addDoc(evaluationsRef, {
    ...data,
    createdAt: serverTimestamp(),
  })
}

export const subscribeEvaluations = (callback) => {
  const q = query(evaluationsRef, orderBy("createdAt", "desc"))
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    callback(data)
  })
}

export const updateEvaluation = async (id, data) => {
  const ref = doc(db, "evaluations", id)
  return await updateDoc(ref, data)
}

export const removeEvaluation = async (id) => {
  const ref = doc(db, "evaluations", id)
  return await deleteDoc(ref)
}

// ============================
// SESSION CONFIG (🔥 FIX FOR YOUR ERROR)
// ============================

const sessionRef = doc(db, "config", "session")

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
  return await setDoc(sessionRef, data, { merge: true })
}
