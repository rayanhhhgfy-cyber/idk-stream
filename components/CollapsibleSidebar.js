"use client";
import { useState, useEffect } from 'react';
import { MessageSquare, X, Users } from 'lucide-react';

export default function CollapsibleSidebar({ children, title = 'Chat' }) {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (isMobile) {
    return (
      <>
        {isOpen && (
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 45,
              background: 'rgba(0,0,0,0.5)',
            }}
          />
        )}

        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          height: isOpen ? '60vh' : '0',
          background: '#141414',
          borderTopLeftRadius: '20px', borderTopRightRadius: '20px',
          borderTop: isOpen ? '1px solid rgba(255,255,255,0.08)' : 'none',
          transition: 'height 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
        }}>
          {isOpen && (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px 8px', flexShrink: 0,
              }}>
                <span style={{ color: 'white', fontWeight: 700, fontSize: '1rem' }}>{title}</span>
                <button onClick={() => setIsOpen(false)} style={{
                  background: 'rgba(255,255,255,0.08)', border: 'none',
                  color: 'white', cursor: 'pointer', padding: '6px',
                  borderRadius: '8px', display: 'flex',
                }}>
                  <X style={{ width: 18, height: 18 }} />
                </button>
              </div>
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {children}
              </div>
            </>
          )}
        </div>

        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            style={{
              position: 'fixed', bottom: '20px', right: '20px', zIndex: 40,
              width: '56px', height: '56px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #e50914, #b20710)',
              border: 'none', color: 'white', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(229,9,20,0.4)',
            }}
          >
            <MessageSquare style={{ width: 24, height: 24 }} />
          </button>
        )}
      </>
    );
  }

  return (
    <div style={{
      position: 'relative', height: '100%',
      display: 'flex', flexShrink: 0,
    }}>
      <div style={{
        width: isOpen ? '340px' : '0',
        overflow: 'hidden',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex', flexDirection: 'column',
        background: '#141414',
        borderLeft: isOpen ? '1px solid rgba(255,255,255,0.08)' : 'none',
        borderRadius: '0 16px 16px 0',
      }}>
        {isOpen && (
          <>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', flexShrink: 0,
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem' }}>{title}</span>
              <button onClick={() => setIsOpen(false)} style={{
                background: 'rgba(255,255,255,0.08)', border: 'none',
                color: 'white', cursor: 'pointer', padding: '6px',
                borderRadius: '8px', display: 'flex',
              }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {children}
            </div>
          </>
        )}
      </div>

      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'absolute', left: '-44px', top: '50%', transform: 'translateY(-50%)',
            width: '40px', height: '40px', borderRadius: '10px 0 0 10px',
            background: '#141414', border: '1px solid rgba(255,255,255,0.08)',
            borderRight: 'none', color: '#888', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <MessageSquare style={{ width: 18, height: 18 }} />
        </button>
      )}
    </div>
  );
}
