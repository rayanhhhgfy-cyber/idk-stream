import Link from 'next/link';
import Image from 'next/image';
import { Lock, Users } from 'lucide-react';
import { getImageUrl } from '@/lib/tmdb';

export default function RoomCard({ room }) {
  const title = room.currentMedia?.title || 'Unknown';
  const poster = room.currentMedia?.poster;
  const participantCount = room._participantCount || 0;

  return (
    <Link
      href={`/watch-party/${room.id}`}
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <div style={{
        background: '#141414', borderRadius: '16px', overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.06)',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        cursor: 'pointer', height: '100%',
      }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#1a1a1a' }}>
          {poster ? (
            <Image
              src={getImageUrl(poster)}
              alt={title}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: '0.8rem' }}>
              No Poster
            </div>
          )}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent 50%)',
          }} />
          <div style={{
            position: 'absolute', bottom: '12px', left: '12px',
            display: 'flex', gap: '8px', alignItems: 'center',
          }}>
            <div style={{
              background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
              borderRadius: '20px', padding: '4px 10px',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}>
              <Users style={{ width: 12, height: 12, color: '#888' }} />
              <span style={{ color: '#ccc', fontSize: '0.7rem', fontWeight: 600 }}>{participantCount}</span>
            </div>
            {room.hasPassword && (
              <div style={{
                background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
                borderRadius: '20px', padding: '4px 8px',
                display: 'flex', alignItems: 'center',
              }}>
                <Lock style={{ width: 12, height: 12, color: '#e50914' }} />
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '14px 16px' }}>
          <h3 style={{
            color: 'white', fontSize: '0.95rem', fontWeight: 700,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            marginBottom: '4px',
          }}>
            {room.name}
          </h3>
          <p style={{
            color: '#666', fontSize: '0.8rem',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {title}
          </p>
        </div>
      </div>
    </Link>
  );
}
