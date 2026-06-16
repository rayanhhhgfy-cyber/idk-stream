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
  }, (err) => {
    console.error('Playback subscription error:', err);
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

  if (room.hasPassword && password) {
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
  } catch (err) {
    console.warn('Failed to leave room:', err);
  }
}

export async function kickParticipant(roomId, userId, kickedByName) {
  try {
    await deleteDoc(doc(db, 'rooms', roomId, 'participants', userId));
  } catch (err) {
    console.warn('Failed to kick participant:', err);
  }
  addSystemMessage(roomId, `${kickedByName} was kicked`);
}

export async function banFromPausing(roomId, userId) {
  const roomRef = doc(db, 'rooms', roomId);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) return;
  const banned = snap.data().bannedFromPausing || [];
  if (!banned.includes(userId)) {
    await updateDoc(roomRef, { bannedFromPausing: [...banned, userId] });
  }
}

export async function unbanFromPausing(roomId, userId) {
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
  } catch (err) {
    console.warn('Failed to update heartbeat:', err);
  }
}

export function subscribeParticipants(roomId, callback) {
  const q = query(collection(db, 'rooms', roomId, 'participants'));
  return onSnapshot(q, (snap) => {
    const participants = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(participants);
  }, (err) => {
    console.error('Participants subscription error:', err);
  });
}

export function subscribeRoom(roomId, callback) {
  return onSnapshot(doc(db, 'rooms', roomId), (snap) => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() });
  }, (err) => {
    console.error('Room subscription error:', err);
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
  }, (err) => {
    console.error('Messages subscription error:', err);
  });
}

export async function sendMessage(roomId, userId, userName, text) {
  const msg = text.trim();
  if (!msg) return;
  await addDoc(collection(db, 'rooms', roomId, 'messages'), {
    userId,
    userName,
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
  } catch (err) {
    console.warn('Failed to send system message:', err);
  }
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
  }, (err) => {
    console.error('Rooms subscription error:', err);
  });
}

export async function cleanupInactiveRooms() {
  try {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const q = query(
      collection(db, 'rooms'),
      where('lastActive', '<', twoHoursAgo)
    );
    const snap = await getDocs(q);
    const results = await Promise.allSettled(snap.docs.map(async (d) => {
      const particip = await getDocs(collection(db, 'rooms', d.id, 'participants'));
      if (particip.size === 0) {
        const msgs = await getDocs(collection(db, 'rooms', d.id, 'messages'));
        await Promise.all(msgs.docs.map(m => deleteDoc(m.ref)));
        await Promise.all(particip.docs.map(p => deleteDoc(p.ref)));
        await deleteDoc(d.ref);
        await remove(ref(rtdb, `rooms/${d.id}/playback`));
      }
    }));
    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      console.warn(`Room cleanup: ${failures.length} deletion(s) failed:`, failures.map(f => f.reason));
    }
  } catch (err) {
    console.error('Failed to clean up inactive rooms:', err);
  }
}
