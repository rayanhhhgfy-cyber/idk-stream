"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Search, Lock, Film, Monitor, Check, Loader2, Users } from 'lucide-react';
import { fetchSearch } from '@/lib/tmdb';
import { getImageUrl } from '@/lib/tmdb';
import { createRoom } from '@/lib/watchParty';
import { getUserId, getDisplayName, setDisplayName } from '@/lib/firebase';

export default function CreateRoom() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [roomName, setRoomName] = useState('');
  const [password, setPassword] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setDisplayNameInput(getDisplayName());
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const data = await fetchSearch(searchQuery);
        const filtered = (data.results || [])
          .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
          .slice(0, 12);
        setSearchResults(filtered);
      } catch (err) { console.warn('Watch party search failed:', err); }
      setSearchLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCreate = async () => {
    if (!roomName.trim()) { setError('Room name is required'); return; }
    if (!selectedMedia) { setError('Select a movie or TV show'); return; }
    if (!displayNameInput.trim()) { setError('Display name is required'); return; }

    setCreating(true);
    setError('');

    setDisplayName(displayNameInput.trim());

    try {
      const media = {
        type: selectedMedia.media_type || 'movie',
        id: selectedMedia.id,
        title: selectedMedia.title || selectedMedia.name,
        poster: selectedMedia.poster_path,
        season: null,
        episode: null,
      };

      const roomId = await createRoom({
        name: roomName.trim(),
        password: hasPassword ? password : '',
        media,
        userId: getUserId(),
        userDisplayName: displayNameInput.trim(),
      });

      router.push(`/watch-party/${roomId}`);
    } catch (err) {
      setError(err.message || 'Failed to create room');
      setCreating(false);
    }
  };

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', paddingTop: '100px', paddingBottom: '80px' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 24px' }}>
        <Link href="/watch-party" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#e50914', fontSize: '0.9rem', textDecoration: 'none', fontWeight: 600, marginBottom: '24px' }}>
          <ArrowLeft style={{ width: 16, height: 16 }} /> Back to rooms
        </Link>

        <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 900, color: 'white', letterSpacing: '-1px', marginBottom: '8px' }}>Create a Watch Party</h1>
        <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '32px' }}>Set up a room to watch together in sync</p>

        {error && (
          <div style={{ background: 'rgba(229,9,20,0.1)', border: '1px solid rgba(229,9,20,0.3)', borderRadius: '12px', padding: '12px 16px', marginBottom: '24px', color: '#ff6b6b', fontSize: '0.85rem', fontWeight: 600 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px' }}>
            <h2 style={{ color: 'white', fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>
              1. Your Display Name
            </h2>
            <input
              type="text"
              value={displayNameInput}
              onChange={(e) => setDisplayNameInput(e.target.value)}
              placeholder="Enter your display name..."
              style={{
                width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px', padding: '14px 16px', color: 'white', fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px' }}>
            <h2 style={{ color: 'white', fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>
              2. Room Name
            </h2>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="e.g. Friday Movie Night"
              style={{
                width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px', padding: '14px 16px', color: 'white', fontSize: '0.9rem',
                outline: 'none', marginBottom: '16px',
              }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#888', fontSize: '0.85rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={hasPassword}
                onChange={(e) => { setHasPassword(e.target.checked); if (!e.target.checked) setPassword(''); }}
                style={{ accentColor: '#e50914', width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <Lock style={{ width: 14, height: 14 }} />
              Lock room with password
            </label>
            {hasPassword && (
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter room password..."
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(229,9,20,0.3)',
                  borderRadius: '12px', padding: '12px 16px', color: 'white', fontSize: '0.85rem',
                  outline: 'none', marginTop: '12px',
                }}
              />
            )}
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px' }}>
            <h2 style={{ color: 'white', fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>
              3. Pick a Movie or TV Show
            </h2>

            {selectedMedia ? (
              <div style={{
                display: 'flex', gap: '16px', alignItems: 'center',
                background: 'rgba(255,255,255,0.04)', borderRadius: '12px',
                padding: '12px', border: '1px solid rgba(229,9,20,0.3)',
              }}>
                <div style={{ position: 'relative', width: '60px', height: '90px', borderRadius: '8px', overflow: 'hidden', background: '#1a1a1a', flexShrink: 0 }}>
                  {selectedMedia.poster_path && (
                    <Image src={getImageUrl(selectedMedia.poster_path)} alt="" fill sizes="60px" style={{ objectFit: 'cover' }} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem' }}>{selectedMedia.title || selectedMedia.name}</p>
                  <p style={{ color: '#888', fontSize: '0.8rem' }}>
                    {selectedMedia.media_type === 'tv' ? 'TV Series' : 'Movie'} • {new Date(selectedMedia.release_date || selectedMedia.first_air_date || Date.now()).getFullYear()}
                  </p>
                </div>
                <button onClick={() => setSelectedMedia(null)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#888', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', fontSize: '0.8rem' }}>
                  Change
                </button>
              </div>
            ) : (
              <>
                <div style={{ position: 'relative', marginBottom: '12px' }}>
                  <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: '#555', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search movies and TV shows..."
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px', padding: '12px 16px 12px 42px', color: 'white', fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>

                {searchLoading && <p style={{ color: '#555', fontSize: '0.8rem', textAlign: 'center' }}>Searching...</p>}

                {searchResults.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
                    {searchResults.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedMedia(item)}
                        style={{
                          display: 'flex', gap: '12px', alignItems: 'center', textAlign: 'left',
                          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: '10px', padding: '10px', cursor: 'pointer', width: '100%',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ position: 'relative', width: '40px', height: '60px', borderRadius: '6px', overflow: 'hidden', background: '#1a1a1a', flexShrink: 0 }}>
                          {item.poster_path && (
                            <Image src={getImageUrl(item.poster_path)} alt="" fill sizes="40px" style={{ objectFit: 'cover' }} />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: 'white', fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.title || item.name}
                          </p>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                            <span style={{ color: '#666', fontSize: '0.7rem' }}>
                              {item.media_type === 'tv' ? '📺 TV' : '🎬 Movie'}
                            </span>
                            {item.vote_average > 0 && (
                              <span style={{ color: '#fbbf24', fontSize: '0.7rem' }}>★ {item.vote_average.toFixed(1)}</span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {!searchQuery && !selectedMedia && (
                  <p style={{ color: '#555', fontSize: '0.8rem', textAlign: 'center', padding: '20px 0' }}>
                    Search for any movie or TV show to watch together
                  </p>
                )}
              </>
            )}
          </div>

          <button
            onClick={handleCreate}
            disabled={creating || !roomName.trim() || !selectedMedia || !displayNameInput.trim()}
            style={{
              width: '100%', padding: '16px', borderRadius: '14px', fontSize: '1rem', fontWeight: 700,
              background: 'linear-gradient(135deg, #e50914, #b20710)',
              color: 'white', border: 'none', cursor: creating ? 'default' : 'pointer',
              opacity: (creating || !roomName.trim() || !selectedMedia || !displayNameInput.trim()) ? 0.5 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: '0 4px 20px rgba(229,9,20,0.3)',
            }}
          >
            {creating ? (
              <>
                <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Creating room...
              </>
            ) : (
              <>
                <Users style={{ width: 20, height: 20 }} />
                Create Room
              </>
            )}
          </button>
          <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    </div>
  );
}
