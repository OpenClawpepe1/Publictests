import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, doc, setDoc, deleteDoc,
  onSnapshot, query, orderBy, updateDoc, serverTimestamp,
} from "firebase/firestore";
import {
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject,
} from "firebase/storage";

// ─── Init ───
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

// ─── Firestore paths ───
const CAMPAIGN_ID = "time-of-troubles";

export const refs = {
  characters: () => collection(db, "campaigns", CAMPAIGN_ID, "characters"),
  sessions: () => collection(db, "campaigns", CAMPAIGN_ID, "sessions"),
  settings: () => doc(db, "campaigns", CAMPAIGN_ID),
  characterDoc: (id) => doc(db, "campaigns", CAMPAIGN_ID, "characters", id),
  sessionDoc: (id) => doc(db, "campaigns", CAMPAIGN_ID, "sessions", id),
};

// ─── Characters CRUD ───
export async function saveCharacter(char) {
  const id = char.id || `char-${Date.now()}`;
  const data = { ...char, id, updatedAt: serverTimestamp() };
  await setDoc(refs.characterDoc(id), data);
  return id;
}

export async function deleteCharacter(id) {
  await deleteDoc(refs.characterDoc(id));
  // Try to clean up avatar and sheets
  try {
    const avatarRef = ref(storage, `campaigns/${CAMPAIGN_ID}/avatars/${id}`);
    await deleteObject(avatarRef);
  } catch (e) { /* no avatar to delete */ }
}

// ─── Sessions CRUD ───
export async function saveSession(session) {
  const id = session.id || `sess-${Date.now()}`;
  const data = { ...session, id, updatedAt: serverTimestamp() };
  await setDoc(refs.sessionDoc(id), data);
  return id;
}

export async function deleteSession(id) {
  await deleteDoc(refs.sessionDoc(id));
}

// ─── Campaign Settings ───
export async function updateSettings(data) {
  await setDoc(refs.settings(), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

// ─── Real-time listeners ───
export function subscribeCharacters(callback) {
  return onSnapshot(refs.characters(), (snapshot) => {
    const chars = snapshot.docs.map(d => d.data());
    callback(chars);
  });
}

export function subscribeSessions(callback) {
  return onSnapshot(refs.sessions(), (snapshot) => {
    const sessions = snapshot.docs.map(d => d.data());
    // Sort by session number descending
    sessions.sort((a, b) => (b.number || 0) - (a.number || 0));
    callback(sessions);
  });
}

export function subscribeSettings(callback) {
  return onSnapshot(refs.settings(), (snapshot) => {
    callback(snapshot.exists() ? snapshot.data() : {});
  });
}

// ─── File Uploads ───
export async function uploadAvatar(characterId, file) {
  const ext = file.name.split('.').pop();
  const filePath = `campaigns/${CAMPAIGN_ID}/avatars/${characterId}.${ext}`;
  const storageRef = ref(storage, filePath);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  // Update character doc with avatar URL
  await updateDoc(refs.characterDoc(characterId), { avatarUrl: url });
  return url;
}

export async function uploadCharacterSheet(characterId, file) {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `campaigns/${CAMPAIGN_ID}/sheets/${characterId}/${timestamp}_${safeName}`;
  const storageRef = ref(storage, filePath);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return { url, name: file.name, uploadedAt: new Date().toISOString(), path: filePath };
}

export async function deleteFile(filePath) {
  const storageRef = ref(storage, filePath);
  await deleteObject(storageRef);
}

// ─── Check if Firebase is configured ───
export function isFirebaseConfigured() {
  return firebaseConfig.apiKey && firebaseConfig.apiKey !== "your-api-key" && firebaseConfig.projectId && firebaseConfig.projectId !== "your-project-id";
}
