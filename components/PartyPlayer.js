"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward } from 'lucide-react';
import PlayerContainer from '@/components/PlayerContainer';
import { subscribeRoom, subscribePlayback, updatePlaybackState, subscribeParticipants } from '@/lib/watchParty';
import { getUserId, getDisplayName } from '@/lib/firebase';

export default function PartyPlayer({ roomId, onMediaChange }) {
  const [media, setMedia] = useState(null);
  const [playback, setPlayback] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isBanned, setIsBanned] = useState(false);
  const playerRef = useRef(null);
  const estimatedTimeRef = useRef(0);
  const lastSyncRef = useRef(Date.now());
  const userId = getUserId();
  const displayName = getDisplayName();

  useEffect(() => {
    const unsubRoom = subscribeRoom(roomId, (room) => {
      setMedia(room.currentMedia);
      const banned = (room.bannedFromPausing || []).includes(userId);
      setIsBanned(banned);
    });

    const unsubPlay = subscribePlayback(roomId, (state) => {
      setPlayback(state);
      estimatedTimeRef.current = state.currentTime || 0;
      lastSyncRef.current = Date.now();
    });

    const unsubParts = subscribeParticipants(roomId, (parts) => {
      setParticipants(parts);
    });

    return () => {
      unsubRoom();
      unsubPlay();
      unsubParts();
    };
  }, [roomId, userId]);

  const handleTogglePlay = useCallback(() => {
    if (isBanned) return;
    const isPaused = !playback?.isPaused;
    updatePlaybackState(roomId, {
      isPaused,
      currentTime: estimatedTimeRef.current,
      lastUpdated: Date.now(),
      updatedBy: userId,
      updatedByName: displayName,
    });
  }, [playback, roomId, userId, displayName, isBanned]);

  if (!media) {
    return (
      <div style={{ width: '100%', aspectRatio: '16/9', background: '#111', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ color: '#555' }}>Loading media...</p>
      </div>
    );
  }

  const isLocallyPaused = playback?.isPaused === true;
  const pausedByMe = playback?.updatedBy === userId;
  const pausedByUser = playback?.updatedByName || 'someone';

  return (
    <div ref={playerRef} style={{ position: 'relative', width: '100%', borderRadius: '16px', overflow: 'hidden' }}>
      <PlayerContainer
        type={media.type}
        id={media.id}
        season={media.season || undefined}
        episode={media.episode || undefined}
      />

      {isLocallyPaused && (
        <div
          onClick={handleTogglePlay}
          style={{
            position: 'absolute', inset: 0, zIndex: 30,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
            cursor: isBanned ? 'not-allowed' : 'pointer',
            transition: 'opacity 0.3s ease',
          }}
        >
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #e50914, #b20710)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(229,9,20,0.4)',
            marginBottom: '16px',
          }}>
            <Play style={{ width: 28, height: 28, color: 'white', marginLeft: '3px', fill: 'white' }} />
          </div>
          <p style={{ color: 'white', fontSize: '1.1rem', fontWeight: 700 }}>
            {isBanned ? 'You are banned from pausing by the room creator' : pausedByMe ? 'Paused by you — click to resume' : `Paused by ${pausedByUser}`}
          </p>
          <p style={{ color: '#888', fontSize: '0.85rem', marginTop: '8px' }}>
            {isBanned ? '' : 'Click to play for everyone'}
          </p>
        </div>
      )}

      {!isLocallyPaused && (
        <div style={{
          position: 'absolute', bottom: '20px', right: '20px', zIndex: 25,
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <span style={{
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
            padding: '6px 12px', borderRadius: '8px',
            color: '#4ade80', fontSize: '0.75rem', fontWeight: 600,
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            {participants.length > 0 ? `${participants.length} watching` : 'Live'}
          </span>
          <button
            onClick={handleTogglePlay}
            disabled={isBanned}
            title={isBanned ? 'Banned from pausing' : 'Pause for everyone'}
            style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
              border: '1px solid rgba(255,255,255,0.1)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: isBanned ? 'not-allowed' : 'pointer', opacity: isBanned ? 0.4 : 1,
              transition: 'all 0.2s',
            }}
          >
            <Pause style={{ width: 18, height: 18 }} />
          </button>
        </div>
      )}
    </div>
  );
}
