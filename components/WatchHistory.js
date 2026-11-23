// ╔══════════════════════════════════════════════════════════════════════╗
// ║                 ⏱️  CONTINUE WATCHING  ⏱️                          ║
// ║                                                                    ║
// ║  Shows the user's recently watched movies/shows so they can resume ║
// ║  where they left off.                                              ║
// ║                                                                    ║
// ║  STYLE: Lumi's Continue Watching card — the poster is clean (no    ║
// ║  badge, no play button, no title inside it), a thin WHITE progress ║
// ║  bar sits at the bottom inside the poster, and the title +         ║
// ║  "Continue" sit BELOW the poster, outside the image.               ║
// ╚══════════════════════════════════════════════════════════════════════╝

"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Clock, Trash2 } from 'lucide-react';
import { getWatchHistory, clearWatchHistory, getWatchProgress, clearWatchProgress } from '@/lib/watchHistory';
import { getImageUrl } from '@/lib/tmdb';

export default function WatchHistory() {
  const [history, setHistory] = useState([]);
  const [progressMap, setProgressMap] = useState({});

  useEffect(() => {
    const h = getWatchHistory();
    setHistory(h);
    const pMap = {};
    h.forEach(item => {
      const p = getWatchProgress(item.id, item.type, item.season, item.episode);
      // Construct the key exactly how the history item is identified
      const key = item.type === 'tv' && item.season && item.episode 
        ? `${item.type}_${item.id}_${item.season}_${item.episode}`
        : `${item.type}_${item.id}`;
      
      if (p) pMap[key] = p;
    });
    setProgressMap(pMap);
  }, []);

  const handleClear = () => {
    clearWatchHistory();
    clearWatchProgress();
    setHistory([]);
    setProgressMap({});
  };

  if (history.length === 0) return null;

  return (
    <section style={{ marginBottom: '48px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Clock style={{ width: 22, height: 22, color: '#e50914' }} /> Continue Watching
        </h2>
        <button onClick={handleClear} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#888', padding: '6px 14px', borderRadius: '8px', fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }}>
          <Trash2 style={{ width: 14, height: 14 }} /> Clear
        </button>
      </div>

      <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', overflowY: 'hidden', padding: '4px 0 16px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {history.map((item) => {
          const key = item.type === 'tv' && item.season && item.episode 
            ? `${item.type}_${item.id}_${item.season}_${item.episode}`
            : `${item.type}_${item.id}`;
            
          const itemProgress = progressMap[key];
          
          return (
            <Link key={key} href={`/watch/${item.type}/${item.id}`} style={{ textDecoration: 'none', flexShrink: 0, width: '160px' }}>
              {/* ── Poster — clean, like Lumi: thin outline, no badge, no
                  play button, no title inside. Only the white progress
                  bar lives inside the poster. */}
              <div style={{ position: 'relative', width: '160px', height: '240px', borderRadius: '12px', overflow: 'hidden', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>
                {item.poster && (<Image src={getImageUrl(item.poster)} alt={item.title || ''} fill sizes="160px" style={{ objectFit: 'cover' }} />)}
                {itemProgress && itemProgress.percentage > 0 && (
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: 'rgba(255,255,255,0.25)', zIndex: 5 }}>
                    <div style={{ height: '100%', width: `${Math.min(itemProgress.percentage, 100)}%`, background: '#ffffff', borderRadius: '0 2px 2px 0' }} />
                  </div>
                )}
              </div>
              {/* ── Title + Continue — below the poster, outside the image. */}
              <div style={{ padding: '8px 2px 4px' }}>
                <p style={{ color: 'white', fontSize: '0.875rem', fontWeight: 600, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.25', marginBottom: '4px' }}>{item.title}</p>
                <p style={{ color: '#a1a1a1', fontSize: '0.8125rem' }}>
                  {item.season ? `S${item.season} : E${item.episode} · Continue` : 'Continue'}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
      <style jsx>{`div::-webkit-scrollbar { display: none; }`}</style>
    </section>
  );
}
