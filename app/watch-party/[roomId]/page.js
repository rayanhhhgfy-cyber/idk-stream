"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Search, LogOut, Edit3, Crown, Users } from 'lucide-react';
import { getImageUrl } from '@/lib/tmdb';
import {
  joinRoom, leaveRoom, subscribeRoom, changeMedia,
  subscribeParticipants, updateHeartbeat
} from '@/lib/watchParty';
import { getUserId, getDisplayName, setDisplayName } from '@/lib/firebase';
import PartyPlayer from '@/components/PartyPlayer';
import CollapsibleSidebar from '@/components/CollapsibleSidebar';
import RoomChat from '@/components/RoomChat';
import ParticipantList from '@/components/ParticipantList';
import LoadingSpinner from '@/components/LoadingSpinner';
import useMediaSearch from '@/lib/useMediaSearch';

export default function RoomPage({ params }) {
  const { roomId } = React.use(params);
  const router = useRouter();
  const userId = getUserId();
  const displayName = getDisplayName();

  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [nameInput, setNameInput] = useState(displayName);
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaSearch, setMediaSearch] = useState('');

  const { results: mediaResults, loading: mediaSearchLoading } = useMediaSearch(mediaSearch, { limit: 12 });

  useEffect(() => {
    const unsub = subscribeRoom(roomId, (data) => {
      if (!data) { setError('Room not found'); setLoading(false); return; }
      setRoom(data);
      setLoading(false);
    });
    return () => unsub();
  }, [roomId]);

  useEffect(() => {
    const unsub = subscribeParticipants(roomId, (parts) => {
      setParticipants(parts);
      const exists = parts.some(p => p.id === userId);
      if (exists && !joined) setJoined(true);
      if (!exists && joined) router.push('/watch-party');
    });
    return () => unsub();
  }, [roomId, userId, joined, router]);

  useEffect(() => {
    if (!joined) return;
    const id = setInterval(() => updateHeartbeat(roomId, userId), 30000);
    return () => clearInterval(id);
  }, [joined, roomId, userId]);

  const handleJoin = async () => {
    if (!nameInput.trim()) { setError('Enter your display name'); return; }
    setJoining(true); setError('');
    setDisplayName(nameInput.trim());
    try {
      await joinRoom(roomId, userId, nameInput.trim(), password || undefined);
      setJoined(true);
    } catch (err) { setError(err.message); }
    setJoining(false);
  };

  const handleLeave = async () => {
    if (!window.confirm('Leave this room?')) return;
    await leaveRoom(roomId, userId);
    router.push('/watch-party');
  };

  const handleChangeMedia = async (item) => {
    await changeMedia(roomId, {
      type: item.media_type || 'movie',
      id: item.id,
      title: item.title || item.name,
      poster: item.poster_path,
      season: null, episode: null
    }, userId, displayName);
    setShowMediaPicker(false);
    setMediaSearch('');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', paddingTop: '64px' }}>
        <LoadingSpinner size={40} message="Loading room..." />
      </div>
    );
  }

  if (error && !room) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', background: '#0a0a0a', paddingTop: '64px' }}>
        <h1 style={{ color: '#e50914', fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px' }}>Room not found</h1>
        <p style={{ color: '#666', marginBottom: '24px' }}>{error}</p>
        <Link href="/watch-party" style={{ padding: '12px 24px', background: '#e50914', color: 'white', borderRadius: '12px', textDecoration: 'none', fontWeight: 600 }}>Browse Rooms</Link>
      </div>
    );
  }

  if (!joined) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', paddingTop: '64px' }}>
        <div style={{ maxWidth: '400px', width: '100%', padding: '32px', borderRadius: '20px', background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(229,9,20,0.2), rgba(229,9,20,0.05))', border: '1px solid rgba(229,9,20,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Users style={{ width: 28, height: 28, color: '#e50914' }} />
            </div>
            <h1 style={{ color: 'white', fontSize: '1.3rem', fontWeight: 800 }}>{room?.name || 'Room'}</h1>
            {room?.currentMedia && <p style={{ color: '#888', fontSize: '0.85rem', marginTop: '4px' }}>Now Playing: {room.currentMedia.title}</p>}
          </div>
          {room?.hasPassword && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: '8px' }}>This room is password-protected</p>
              <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter room password..." style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 16px', color: 'white', fontSize: '0.85rem', outline: 'none' }} />
            </div>
          )}
          <div style={{ marginBottom: '20px' }}>
            <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: '8px' }}>Your display name</p>
            <input type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="Enter your name..." style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 16px', color: 'white', fontSize: '0.85rem', outline: 'none' }} />
          </div>
          {error && <div style={{ background: 'rgba(229,9,20,0.1)', border: '1px solid rgba(229,9,20,0.3)', borderRadius: '8px', padding: '8px 12px', marginBottom: '16px', color: '#ff6b6b', fontSize: '0.8rem', fontWeight: 600 }}>{error}</div>}
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link href="/watch-party" style={{ flex: 1, textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: '#888', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }}>Back</Link>
            <button onClick={handleJoin} disabled={joining} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #e50914, #b20710)', border: 'none', borderRadius: '12px', color: 'white', fontSize: '0.9rem', fontWeight: 700, cursor: joining ? 'default' : 'pointer', opacity: joining ? 0.6 : 1 }}>{joining ? 'Joining...' : 'Join Room'}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#0a0a0a', height: '100vh', display: 'flex', flexDirection: 'column', paddingTop: '64px', overflow: 'hidden' }}>
      <div style={{ background: 'rgba(20,20,20,0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: '12px', flexWrap: 'wrap', minHeight: '44px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/watch-party" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#e50914', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 600 }}><ArrowLeft style={{ width: 16, height: 16 }} /> Rooms</Link>
          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem' }}>{room?.name || 'Room'}</span>
          {room?.currentMedia && <span style={{ color: '#666', fontSize: '0.8rem' }}>— {room.currentMedia.title}</span>}
          {room?.createdBy === userId && (
            <button onClick={() => setShowMediaPicker(true)} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(229,9,20,0.1)', border: '1px solid rgba(229,9,20,0.2)', color: '#e50914', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
              <Edit3 style={{ width: 12, height: 12 }} /> Change
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#888', fontSize: '0.8rem' }}>
            <Crown style={{ width: 14, height: 14, color: '#e50914' }} />
            <span>{participants.filter(p => p.isCreator).map(p => p.name).join(', ') || 'Creator'}</span>
          </div>
          <button onClick={handleLeave} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#ff6b6b', padding: '6px 14px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}><LogOut style={{ width: 14, height: 14 }} /> Leave</button>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '100%', maxWidth: '1200px' }}>
                <PartyPlayer roomId={roomId} />
              </div>
            </div>
          </div>
        </div>
        <CollapsibleSidebar title="Room Chat">
          <ParticipantList roomId={roomId} />
          <RoomChat roomId={roomId} />
        </CollapsibleSidebar>
      </div>
      {showMediaPicker && (
        <div onClick={() => { setShowMediaPicker(false); setMediaSearch(''); }} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '100%', background: '#141414', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', padding: '24px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ color: 'white', fontWeight: 700, fontSize: '1.1rem' }}>Change Media</h3>
              <button onClick={() => { setShowMediaPicker(false); setMediaSearch(''); }} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: 'white', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer' }}>X</button>
            </div>
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: '#555', pointerEvents: 'none' }} />
              <input type="text" value={mediaSearch} onChange={(e) => setMediaSearch(e.target.value)} placeholder="Search movies and TV shows..." style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 16px 12px 42px', color: 'white', fontSize: '0.9rem', outline: 'none' }} />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {mediaSearchLoading && <p style={{ color: '#555', fontSize: '0.8rem', textAlign: 'center', padding: '20px' }}>Searching...</p>}
              {mediaResults.map((item) => (
                <button key={item.id} onClick={() => handleChangeMedia(item)} style={{ display: 'flex', gap: '12px', alignItems: 'center', textAlign: 'left', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '10px', cursor: 'pointer', width: '100%' }}>
                  <div style={{ position: 'relative', width: '40px', height: '60px', borderRadius: '6px', overflow: 'hidden', background: '#1a1a1a', flexShrink: 0 }}>
                    {item.poster_path && <Image src={getImageUrl(item.poster_path)} alt="" fill sizes="40px" style={{ objectFit: 'cover' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: 'white', fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title || item.name}</p>
                    <span style={{ color: '#666', fontSize: '0.7rem' }}>{item.media_type === 'tv' ? 'TV Series' : 'Movie'}</span>
                  </div>
                </button>
              ))}
              {!mediaSearch && !mediaSearchLoading && <p style={{ color: '#555', fontSize: '0.8rem', textAlign: 'center', padding: '20px' }}>Search for a new movie or show</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
