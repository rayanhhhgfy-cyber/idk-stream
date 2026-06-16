"use client";
import MovieCard from '@/components/MovieCard';

export default function MediaGrid({ items, type }) {
  if (!items || items.length === 0) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '20px' }}>
      {items.map((item, idx) => (
        <MovieCard key={`${item.id}-${idx}`} movie={item} type={type || item.media_type || 'movie'} />
      ))}
    </div>
  );
}
