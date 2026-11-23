"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { Send } from 'lucide-react';
import { subscribeMessages, sendMessage } from '@/lib/watchParty';
import { getUserId, getDisplayName } from '@/lib/firebase';

export default function RoomChat({ roomId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const listRef = useRef(null);
  const bottomRef = useRef(null);
  const userId = getUserId();
  const displayName = getDisplayName();

  useEffect(() => {
    const unsub = subscribeMessages(roomId, (msgs) => {
      setMessages(msgs);
    });
    return unsub;
  }, [roomId]);

  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const threshold = 100;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    setIsNearBottom(nearBottom);
  }, []);

  useEffect(() => {
    if (isNearBottom && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isNearBottom]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    await sendMessage(roomId, userId, displayName, input);
    setInput('');
    setSending(false);
  };

  const formatTime = (ts) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}>
      <div
        ref={listRef}
        onScroll={handleScroll}
        style={{
          flex: 1, overflowY: 'auto', padding: '12px 16px',
          display: 'flex', flexDirection: 'column', gap: '6px',
          scrollbarWidth: 'thin', scrollbarColor: '#333 transparent',
        }}
      >
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#555', fontSize: '0.8rem', padding: '40px 0' }}>
            No messages yet. Start the conversation!
          </div>
        )}

        {messages.map((msg) => {
          const isSystem = msg.isSystem;
          const isMine = msg.userId === userId;
          return (
            <div key={msg.id} style={{
              display: 'flex', flexDirection: 'column',
              alignItems: isSystem ? 'center' : isMine ? 'flex-end' : 'flex-start',
            }}>
              {isSystem ? (
                <div style={{
                  background: 'rgba(255,255,255,0.04)', color: '#666',
                  padding: '4px 12px', borderRadius: '12px',
                  fontSize: '0.7rem', textAlign: 'center', maxWidth: '80%',
                }}>
                  {msg.text}
                </div>
              ) : (
                <div style={{
                  maxWidth: '85%',
                  background: isMine ? 'rgba(229,9,20,0.15)' : 'rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  borderBottomRightRadius: isMine ? '4px' : '12px',
                  borderBottomLeftRadius: isMine ? '12px' : '4px',
                  padding: '8px 12px',
                }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    gap: '8px', marginBottom: '2px',
                  }}>
                    <span style={{
                      color: isMine ? '#ff6b6b' : '#4da6ff',
                      fontSize: '0.7rem', fontWeight: 700,
                    }}>
                      {msg.userName}
                    </span>
                    <span style={{ color: '#555', fontSize: '0.6rem' }}>
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  <p style={{ color: '#ddd', fontSize: '0.85rem', wordBreak: 'break-word', lineHeight: 1.4 }}>
                    {msg.text}
                  </p>
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} style={{
        display: 'flex', gap: '8px', padding: '10px 16px 16px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          style={{
            flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px', padding: '10px 14px', color: 'white',
            fontSize: '0.85rem', outline: 'none',
          }}
        />
        <button type="submit" disabled={!input.trim() || sending} style={{
          background: input.trim() ? 'linear-gradient(135deg, #e50914, #b20710)' : 'rgba(255,255,255,0.06)',
          border: 'none', borderRadius: '10px', width: '40px', height: '40px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: input.trim() ? 'pointer' : 'default', opacity: input.trim() ? 1 : 0.4,
          transition: 'all 0.2s', flexShrink: 0,
        }}>
          <Send style={{ width: 16, height: 16, color: 'white' }} />
        </button>
      </form>
    </div>
  );
}
