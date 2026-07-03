"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Clock, Star, Trash2, Play } from 'lucide-react';
import { getWatchHistory, clearWatchHistory, getWatchProgress, clearWatchProgress, formatWatchTime } from '@/lib/watchHistory';
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
          const resumeTime = itemProgress ? formatWatchTime(itemProgress.watchedSeconds) : null;
          
          return (
            <Link key={key} href={`/watch/${item.type}/${item.id}`} style={{ textDecoration: 'none', flexShrink: 0, width: '160px' }}>
              <div style={{ position: 'relative', width: '160px', height: '240px', borderRadius: '12px', overflow: 'hidden', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', transition: 'transform 0.3s ease, box-shadow 0.3s ease', cursor: 'pointer' }}>
                {item.poster && (<Image src={getImageUrl(item.poster)} alt={item.title || ''} fill sizes="160px" style={{ objectFit: 'cover' }} />)}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%', background: 'linear-gradient(to top, rgba(0,0,0,0.95), transparent)' }} />
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(229,9,20,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.8 }}>
                  <Play style={{ width: 18, height: 18, color: 'white', marginLeft: '2px' }} />
                </div>
                {resumeTime && (
                  <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(229,9,20,0.85)', backdropFilter: 'blur(6px)', borderRadius: '6px', padding: '3px 8px', fontSize: '0.6rem', fontWeight: 700, color: 'white' }}>
                    ▶ {resumeTime}
                  </div>
                )}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px' }}>
                  <p style={{ color: 'white', fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>{item.title}</p>
                  {item.season && (<p style={{ color: '#aaa', fontSize: '0.7rem' }}>S{item.season} : E{item.episode}</p>)}
                  {item.rating > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '4px' }}>
                      <Star style={{ width: 10, height: 10, fill: '#fbbf24', color: '#fbbf24' }} />
                      <span style={{ color: '#fbbf24', fontSize: '0.7rem', fontWeight: 600 }}>{item.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                {itemProgress && itemProgress.percentage > 0 && (
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: 'rgba(255,255,255,0.15)', zIndex: 5 }}>
                    <div style={{ height: '100%', width: `${Math.min(itemProgress.percentage, 100)}%`, background: 'linear-gradient(90deg, #e50914, #ff3d3d)', borderRadius: '0 2px 2px 0', boxShadow: '0 0 6px rgba(229,9,20,0.5)' }} />
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
      <style jsx>{`div::-webkit-scrollbar { display: none; }`}</style>
    </section>
  );
}
