import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const config = JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG || '{}');

const app = getApps().length === 0 ? initializeApp(config) : getApps()[0];

export const db = getFirestore(app);
export const rtdb = getDatabase(app);

let userId = null;
let displayName = null;

function generateId() {
  return 'u_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
}

export function getUserId() {
  if (typeof window === 'undefined') return null;
  if (userId) return userId;
  userId = localStorage.getItem('idk_uid');
  if (!userId) {
    userId = generateId();
    localStorage.setItem('idk_uid', userId);
  }
  return userId;
}

export function getDisplayName() {
  if (typeof window === 'undefined') return 'Anonymous';
  if (displayName) return displayName;
  displayName = localStorage.getItem('idk_display_name');
  if (!displayName) {
    displayName = 'User_' + Math.random().toString(36).substring(2, 6).toUpperCase();
    localStorage.setItem('idk_display_name', displayName);
  }
  return displayName;
}

export function setDisplayName(name) {
  displayName = name;
  localStorage.setItem('idk_display_name', name);
}
