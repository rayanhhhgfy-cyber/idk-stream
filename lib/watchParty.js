import {
  collection, doc, setDoc, addDoc, getDoc, getDocs, deleteDoc, updateDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp
} from 'firebase/firestore';
import { ref, update, onValue, remove } from 'firebase/database';
import { db, rtdb } from '@/lib/firebase';

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + ':idkstream_salt_v1');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function getPlaybackRef(roomId) {
  return ref(rtdb, `rooms/${roomId}/playback`);
}

export function subscribePlayback(roomId, callback) {
  const r = getPlaybackRef(roomId);
  const unsub = onValue(r, (snap) => {
    const data = snap.val();
    if (data) callback(data);
  });
  return unsub;
}

export function updatePlaybackState(roomId, state) {
  return update(getPlaybackRef(roomId), state);
}

export async function createRoom({ name, password, media, userId, userDisplayName }) {
  const roomRef = doc(collection(db, 'rooms'));
  const roomId = roomRef.id;

  const roomData = {
    name: name.trim(),
    hasPassword: !!password,
    passwordHash: password ? await hashPassword(password) : '',
    createdAt: Date.now(),
    createdBy: userId,
    currentMedia: {
      type: media.type,
      id: media.id,
      title: media.title,
      poster: media.poster,
      season: media.season || null,
      episode: media.episode || null,
    },
    lastActive: Date.now(),
    bannedFromPausing: [],
  };

  await setDoc(roomRef, roomData);

  await setDoc(doc(db, 'rooms', roomId, 'participants', userId), {
    name: userDisplayName,
    joinedAt: Date.now(),
    isCreator: true,
    lastHeartbeat: Date.now(),
  });

  await updatePlaybackState(roomId, {
    isPaused: true,
    currentTime: 0,
    lastUpdated: Date.now(),
    updatedBy: userId,
    updatedByName: userDisplayName,
  });

  return roomId;
}

export async function joinRoom(roomId, userId, userDisplayName, password) {
  const roomSnap = await getDoc(doc(db, 'rooms', roomId));
  if (!roomSnap.exists()) throw new Error('Room not found');

  const room = roomSnap.data();

  if (room.hasPassword) {
    if (!password) throw new Error('Password required');
    const hash = await hashPassword(password);
    if (hash !== room.passwordHash) throw new Error('Wrong password');
  }

  await setDoc(doc(db, 'rooms', roomId, 'participants', userId), {
    name: userDisplayName,
    joinedAt: Date.now(),
    isCreator: false,
    lastHeartbeat: Date.now(),
  });

  addSystemMessage(roomId, `${userDisplayName} joined`);
}

export async function leaveRoom(roomId, userId) {
  try {
    await deleteDoc(doc(db, 'rooms', roomId, 'participants', userId));
  } catch {}
}

async function verifyRoomCreator(roomId, callerId) {
  const callerSnap = await getDoc(doc(db, 'rooms', roomId, 'participants', callerId));
  if (!callerSnap.exists() || !callerSnap.data().isCreator) {
    throw new Error('Only the room creator can perform this action');
  }
}

export async function kickParticipant(roomId, userId, kickedByName, callerId) {
  await verifyRoomCreator(roomId, callerId);
  try {
    await deleteDoc(doc(db, 'rooms', roomId, 'participants', userId));
  } catch {}
  addSystemMessage(roomId, `${kickedByName} was kicked`);
}

export async function banFromPausing(roomId, userId, callerId) {
  await verifyRoomCreator(roomId, callerId);
  const roomRef = doc(db, 'rooms', roomId);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) return;
  const banned = snap.data().bannedFromPausing || [];
  if (!banned.includes(userId)) {
    await updateDoc(roomRef, { bannedFromPausing: [...banned, userId] });
  }
}

export async function unbanFromPausing(roomId, userId, callerId) {
  await verifyRoomCreator(roomId, callerId);
  const roomRef = doc(db, 'rooms', roomId);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) return;
  const banned = snap.data().bannedFromPausing || [];
  await updateDoc(roomRef, { bannedFromPausing: banned.filter(id => id !== userId) });
}

export async function changeMedia(roomId, media, userId, userDisplayName) {
  const roomRef = doc(db, 'rooms', roomId);
  await updateDoc(roomRef, {
    currentMedia: {
      type: media.type,
      id: media.id,
      title: media.title,
      poster: media.poster,
      season: media.season || null,
      episode: media.episode || null,
    },
    lastActive: Date.now(),
  });

  await updatePlaybackState(roomId, {
    isPaused: true,
    currentTime: 0,
    lastUpdated: Date.now(),
    updatedBy: userId,
    updatedByName: userDisplayName,
  });

  addSystemMessage(roomId, `Media changed to "${media.title}" by ${userDisplayName}`);
}

export async function updateHeartbeat(roomId, userId) {
  try {
    await updateDoc(doc(db, 'rooms', roomId, 'participants', userId), {
      lastHeartbeat: Date.now(),
    });
  } catch {}
}

export function subscribeParticipants(roomId, callback) {
  const q = query(collection(db, 'rooms', roomId, 'participants'));
  return onSnapshot(q, (snap) => {
    const participants = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(participants);
  });
}

export function subscribeRoom(roomId, callback) {
  return onSnapshot(doc(db, 'rooms', roomId), (snap) => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() });
  });
}

export function subscribeMessages(roomId, callback) {
  const q = query(
    collection(db, 'rooms', roomId, 'messages'),
    orderBy('timestamp', 'asc'),
    limit(100)
  );
  return onSnapshot(q, (snap) => {
    const messages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(messages);
  });
}

const MAX_MESSAGE_LENGTH = 500;
const MAX_DISPLAY_NAME_LENGTH = 30;

function sanitizeText(str, maxLen) {
  return String(str).trim().slice(0, maxLen);
}

export async function sendMessage(roomId, userId, userName, text) {
  const msg = sanitizeText(text, MAX_MESSAGE_LENGTH);
  if (!msg) return;
  await addDoc(collection(db, 'rooms', roomId, 'messages'), {
    userId,
    userName: sanitizeText(userName, MAX_DISPLAY_NAME_LENGTH),
    text: msg,
    timestamp: Date.now(),
  });
}

async function addSystemMessage(roomId, text) {
  try {
    await addDoc(collection(db, 'rooms', roomId, 'messages'), {
      userId: 'system',
      userName: 'System',
      text,
      timestamp: Date.now(),
      isSystem: true,
    });
  } catch {}
}

export function subscribeRooms(callback) {
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  const q = query(
    collection(db, 'rooms'),
    where('lastActive', '>', twoHoursAgo),
    orderBy('lastActive', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const rooms = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(rooms);
  });
}

export async function cleanupInactiveRooms() {
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  const q = query(
    collection(db, 'rooms'),
    where('lastActive', '<', twoHoursAgo)
  );
  const snap = await getDocs(q);
  const deletions = snap.docs.map(async (d) => {
    const particip = await getDocs(collection(db, 'rooms', d.id, 'participants'));
    if (particip.size === 0) {
      const msgs = await getDocs(collection(db, 'rooms', d.id, 'messages'));
      await Promise.all(msgs.docs.map(m => deleteDoc(m.ref)));
      await Promise.all(particip.docs.map(p => deleteDoc(p.ref)));
      await deleteDoc(d.ref);
      await remove(ref(rtdb, `rooms/${d.id}/playback`));
    }
  });
  await Promise.all(deletions);
}
