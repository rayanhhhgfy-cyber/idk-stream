"use client";
import { useState, useEffect } from 'react';
import { Shield, ShieldOff, LogOut, Crown } from 'lucide-react';
import { subscribeParticipants, kickParticipant, banFromPausing, unbanFromPausing } from '@/lib/watchParty';
import { getUserId, getDisplayName } from '@/lib/firebase';

export default function ParticipantList({ roomId }) {
  const [participants, setParticipants] = useState([]);
  const userId = getUserId();
  const displayName = getDisplayName();

  useEffect(() => {
    const unsub = subscribeParticipants(roomId, (parts) => {
      setParticipants(parts);
    });
    return unsub;
  }, [roomId]);

  const me = participants.find(p => p.id === userId);
  const isCreator = me?.isCreator;

  const handleKick = async (targetId, targetName) => {
    if (!isCreator || targetId === userId) return;
    await kickParticipant(roomId, targetId, displayName);
  };

  const handleBanPause = async (targetId) => {
    if (!isCreator || targetId === userId) return;
    await banFromPausing(roomId, targetId);
  };

  const handleUnbanPause = async (targetId) => {
    if (!isCreator || targetId === userId) return;
    await unbanFromPausing(roomId, targetId);
  };

  return (
    <div style={{ padding: '12px 16px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <Crown style={{ width: 16, height: 16, color: '#e50914' }} />
        <span style={{ color: 'white', fontSize: '0.85rem', fontWeight: 600 }}>
          Participants ({participants.length})
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {participants.map((p) => {
          const isMe = p.id === userId;
          const isCreatorBadge = p.isCreator;
          return (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 10px', borderRadius: '10px',
              background: isMe ? 'rgba(229,9,20,0.08)' : 'transparent',
              border: isMe ? '1px solid rgba(229,9,20,0.2)' : '1px solid transparent',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: isCreatorBadge
                    ? 'linear-gradient(135deg, #e50914, #b20710)'
                    : 'rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <span style={{ color: 'white', fontSize: '0.75rem', fontWeight: 700 }}>
                    {p.name?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <span style={{
                    color: 'white', fontSize: '0.8rem', fontWeight: 600,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    display: 'block',
                  }}>
                    {p.name} {isMe && '(you)'}
                  </span>
                  {isCreatorBadge && (
                    <span style={{ color: '#e50914', fontSize: '0.65rem', fontWeight: 600 }}>
                      Room Creator
                    </span>
                  )}
                </div>
              </div>

              {isCreator && !isMe && (
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  <button
                    onClick={() => handleKick(p.id, p.name)}
                    title="Kick user"
                    style={{
                      background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.2)',
                      borderRadius: '6px', padding: '4px', cursor: 'pointer',
                      color: '#ff4444', display: 'flex',
                    }}
                  >
                    <LogOut style={{ width: 14, height: 14 }} />
                  </button>
                  <button
                    onClick={() => handleBanPause(p.id)}
                    title="Ban from pausing"
                    style={{
                      background: 'rgba(255,150,0,0.1)', border: '1px solid rgba(255,150,0,0.2)',
                      borderRadius: '6px', padding: '4px', cursor: 'pointer',
                      color: '#ff9900', display: 'flex',
                    }}
                  >
                    <ShieldOff style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              )}

              {isCreator && !isMe && (
                <button
                  onClick={() => handleUnbanPause(p.id)}
                  title="Unban from pausing"
                  style={{
                    background: 'rgba(50,200,50,0.1)', border: '1px solid rgba(50,200,50,0.2)',
                    borderRadius: '6px', padding: '4px', cursor: 'pointer',
                    color: '#4ade80', display: 'flex',
                  }}
                >
                  <Shield style={{ width: 14, height: 14 }} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
