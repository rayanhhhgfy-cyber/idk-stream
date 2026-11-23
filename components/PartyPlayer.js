"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RefreshCw } from 'lucide-react';
import PlayerContainer from '@/components/PlayerContainer';
import { subscribeRoom, subscribePlayback, subscribeParticipants, updateSyncState } from '@/lib/watchParty';
import { getUserId, getDisplayName } from '@/lib/firebase';

export default function PartyPlayer({ roomId, onMediaChange }) {
  const [media, setMedia] = useState(null);
  const [playback, setPlayback] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isBanned, setIsBanned] = useState(false);
  const [syncStatus, setSyncStatus] = useState('synced');
  const playerRef = useRef(null);
  const estimatedTimeRef = useRef(0);
  const lastSyncRef = useRef(Date.now());
  const syncIntervalRef = useRef(null);
  const lastBufferingRef = useRef(false);
  const userId = getUserId();
  const displayName = getDisplayName();

  const othersBuffering = playback?.isBuffering && playback?.updatedBy !== userId;
  const whoIsBuffering = othersBuffering ? (playback?.updatedByName || 'Someone') : null;

  useEffect(() => {
    const unsubRoom = subscribeRoom(roomId, (room) => {
      setMedia(room.currentMedia);
      const banned = (room.bannedFromPausing || []).includes(userId);
      setIsBanned(banned);
    });

    const unsubPlay = subscribePlayback(roomId, (state) => {
      setPlayback(state);

      // Detect large position drift from our estimated time
      if (state.currentTime && estimatedTimeRef.current) {
        const drift = Math.abs(state.currentTime - estimatedTimeRef.current);
        if (drift > 10 && state.updatedBy !== userId) {
          setSyncStatus('syncing');
          // Try to seek the iframe by sending postMessage
          const iframe = playerRef.current?.querySelector('iframe[data-player="true"]');
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({
              event: 'seek',
              currentTime: state.currentTime,
            }, '*');
          }
          // Reset sync status after a moment
          setTimeout(() => setSyncStatus('synced'), 3000);
        }
      }
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

  // Sync timer - send periodic time updates to keep everyone in sync
  useEffect(() => {
    syncIntervalRef.current = setInterval(() => {
      if (!playback?.isPaused) {
        // Estimate current time since last sync
        const elapsed = (Date.now() - lastSyncRef.current) / 1000;
        const estimatedTime = (estimatedTimeRef.current || 0) + elapsed;

        updateSyncState(roomId, userId, displayName, {
          currentTime: estimatedTime,
          isPaused: false,
          isBuffering: lastBufferingRef.current,
        });
      }
    }, 5000);

    return () => clearInterval(syncIntervalRef.current);
  }, [roomId, userId, displayName, playback?.isPaused]);

  const handleSyncTime = useCallback((currentTime, isBuffering) => {
    estimatedTimeRef.current = currentTime;
    lastSyncRef.current = Date.now();
    lastBufferingRef.current = isBuffering;

    // Send periodic sync updates (throttled by the interval above)
  }, []);

  const handleTogglePlay = useCallback(() => {
    if (isBanned) return;
    const isPaused = !playback?.isPaused;
    updateSyncState(roomId, userId, displayName, {
      isPaused,
      currentTime: estimatedTimeRef.current,
      isBuffering: false,
    });
  }, [playback, roomId, userId, displayName, isBanned]);

  const handleForceSync = useCallback(() => {
    // Force a seek on the iframe to match server time
    const iframe = playerRef.current?.querySelector('iframe[data-player="true"]');
    if (iframe && iframe.contentWindow && playback?.currentTime) {
      iframe.contentWindow.postMessage({
        event: 'seek',
        currentTime: playback.currentTime,
      }, '*');
      setSyncStatus('synced');
    }
  }, [playback]);

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
        onSyncTime={handleSyncTime}
      />

      {/* Buffering overlay - shown when ANYONE in the party is buffering */}
      {othersBuffering && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 29,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
          transition: 'opacity 0.3s ease',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            background: 'rgba(255, 183, 3, 0.15)', border: '1px solid rgba(255, 183, 3, 0.3)',
            borderRadius: '16px', padding: '16px 24px',
          }}>
            <div style={{ width: '20px', height: '20px', border: '3px solid rgba(255,183,3,0.3)', borderTopColor: '#ffb703', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
            <div>
              <p style={{ color: '#ffb703', fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>
                Waiting for {whoIsBuffering}
              </p>
              <p style={{ color: '#aaa', fontSize: '0.75rem', margin: '4px 0 0' }}>
                Their connection is catching up...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sync status indicator */}
      {syncStatus === 'syncing' && !othersBuffering && (
        <div style={{
          position: 'absolute', top: '12px', left: '12px', zIndex: 29,
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)',
          backdropFilter: 'blur(8px)', borderRadius: '8px',
          padding: '5px 12px',
        }}>
          <RefreshCw style={{ width: 12, height: 12, color: '#60a5fa', animation: 'spin 1s linear infinite' }} />
          <span style={{ color: '#60a5fa', fontSize: '0.7rem', fontWeight: 700 }}>Syncing...</span>
        </div>
      )}

      {isLocallyPaused && (
        <div
          onClick={handleTogglePlay}
          style={{
            position: 'absolute', inset: 0, zIndex: 28,
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
            onClick={handleForceSync}
            title="Force sync position"
            style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
              border: '1px solid rgba(255,255,255,0.1)', color: '#60a5fa',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.2s',
              fontSize: '0.7rem',
            }}
          >
            <RefreshCw style={{ width: 14, height: 14 }} />
          </button>
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
