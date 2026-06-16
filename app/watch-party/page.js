"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Plus, Video } from 'lucide-react';
import { subscribeRooms, cleanupInactiveRooms } from '@/lib/watchParty';
import RoomCard from '@/components/RoomCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { getDb } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function WatchPartyBrowse() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cleanupInactiveRooms();

    const unsub = subscribeRooms(async (roomsData) => {
      const withCounts = await Promise.all(roomsData.map(async (room) => {
        try {
          const parts = await getDocs(collection(db, 'rooms', room.id, 'participants'));
          return { ...room, _participantCount: parts.size };
        } catch {
          return { ...room, _participantCount: 0 };
        }
      }));
      setRooms(withCounts);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', paddingTop: '100px', paddingBottom: '80px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(229,9,20,0.2), rgba(229,9,20,0.05))', border: '1px solid rgba(229,9,20,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users style={{ width: 26, height: 26, color: '#e50914' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.5rem)', fontWeight: 900, color: 'white', letterSpacing: '-1px' }}>Watch Together</h1>
              <p style={{ color: '#666', fontSize: '0.9rem' }}>Join a room or create your own</p>
            </div>
          </div>
          <Link href="/watch-party/create" style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'linear-gradient(135deg, #e50914, #b20710)',
            color: 'white', padding: '12px 24px', borderRadius: '12px',
            textDecoration: 'none', fontWeight: 700, fontSize: '0.95rem',
            boxShadow: '0 4px 20px rgba(229,9,20,0.3)',
          }}>
            <Plus style={{ width: 18, height: 18 }} />
            Create Room
          </Link>
        </div>

        {loading && <LoadingSpinner message="Loading rooms..." />}

        {!loading && rooms.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <EmptyState
              icon={Video}
              title="No rooms yet"
              subtitle="Create the first watch party and invite your friends to watch together in sync!"
            />
            <Link href="/watch-party/create" style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'linear-gradient(135deg, #e50914, #b20710)',
              color: 'white', padding: '12px 28px', borderRadius: '12px',
              textDecoration: 'none', fontWeight: 700,
              boxShadow: '0 4px 20px rgba(229,9,20,0.3)',
            }}>
              <Plus style={{ width: 18, height: 18 }} />
              Create first room
            </Link>
          </div>
        )}

        {!loading && rooms.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
