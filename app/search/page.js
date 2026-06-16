"use client";
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import useMediaSearch from '@/lib/useMediaSearch';
import MediaGrid from '@/components/MediaGrid';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { Search as SearchIcon, X, Film } from 'lucide-react';

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const { results, loading } = useMediaSearch(query);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
      <h1 style={{
        fontSize: 'clamp(2rem, 4vw, 3rem)',
        fontWeight: 900, color: 'white',
        letterSpacing: '-1px', marginBottom: '32px',
      }}>
        Search
      </h1>

      {/* Search Input */}
      <div style={{ position: 'relative', marginBottom: '48px' }}>
        <SearchIcon style={{
          position: 'absolute', left: '20px', top: '50%',
          transform: 'translateY(-50%)', width: 22, height: 22,
          color: '#555', pointerEvents: 'none',
        }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search movies, TV shows..."
          autoFocus
          style={{
            width: '100%', background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px',
            padding: '18px 50px 18px 56px', color: 'white',
            fontSize: '1.1rem', outline: 'none',
            transition: 'border-color 0.3s, box-shadow 0.3s',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'rgba(229,9,20,0.5)';
            e.target.style.boxShadow = '0 0 20px rgba(229,9,20,0.1)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(255,255,255,0.1)';
            e.target.style.boxShadow = 'none';
          }}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            style={{
              position: 'absolute', right: '16px', top: '50%',
              transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.1)',
              border: 'none', borderRadius: '50%', width: '28px', height: '28px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#888',
            }}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        )}
      </div>

      {loading && <LoadingSpinner />}

      {!loading && results.length > 0 && (
        <div>
          <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '24px' }}>
            Found <span style={{ color: 'white', fontWeight: 600 }}>{results.length}</span> results for &quot;<span style={{ color: '#e50914' }}>{query}</span>&quot;
          </p>
          <MediaGrid items={results} />
        </div>
      )}

      {!loading && !query && (
        <EmptyState
          icon={Film}
          title="Discover something new"
          subtitle="Search for your favorite movies and TV shows across our entire catalog."
          iconColor="#e50914"
          iconBg="rgba(229,9,20,0.1)"
        />
      )}

      {!loading && query && results.length === 0 && (
        <EmptyState
          icon={SearchIcon}
          title="No results found"
          subtitle="Try searching with different keywords."
        />
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', paddingTop: '100px', paddingBottom: '80px' }}>
      <Suspense fallback={<LoadingSpinner />}>
        <SearchContent />
      </Suspense>
    </div>
  );
}
