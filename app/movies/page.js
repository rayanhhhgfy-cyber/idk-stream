"use client";
import { useState, useEffect } from 'react';
import { fetchDiscoverMovies, fetchMovieGenres } from '@/lib/tmdb';
import MovieCard from '@/components/MovieCard';
import { Film, SlidersHorizontal, ChevronDown } from 'lucide-react';

const SORT_OPTIONS = [
  { value: 'popularity.desc', label: 'Most Popular' },
  { value: 'vote_average.desc', label: 'Highest Rated' },
  { value: 'primary_release_date.desc', label: 'Newest First' },
  { value: 'primary_release_date.asc', label: 'Oldest First' },
  { value: 'original_title.asc', label: 'Title A-Z' },
];

const YEARS = Array.from({ length: 56 }, (_, i) => 2025 - i);

export default function MoviesPage() {
  const [movies, setMovies] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [genres, setGenres] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSort, setSelectedSort] = useState('popularity.desc');

  // Load genres once
  useEffect(() => {
    fetchMovieGenres().then(data => setGenres(data.genres || [])).catch(() => {});
  }, []);

  // Fetch movies when filters or page change
  useEffect(() => {
    const loadMovies = async () => {
      setLoading(true);
      try {
        const data = await fetchDiscoverMovies(page, {
          genre: selectedGenre, year: selectedYear, sortBy: selectedSort,
        });
        setMovies(prev => page === 1 ? data.results : [...prev, ...data.results]);
        setTotalPages(data.total_pages);
      } catch (err) { console.error('Error loading movies:', err); }
      finally { setLoading(false); }
    };
    loadMovies();
  }, [page, selectedGenre, selectedYear, selectedSort]);

  // Reset to page 1 when filters change
  const handleFilterChange = (setter) => (value) => {
    setter(value);
    setPage(1);
    setMovies([]);
  };

  const loadMore = () => { if (page < totalPages) setPage(prev => prev + 1); };

  const selectStyle = {
    background: 'rgba(255,255,255,0.06)', color: 'white',
    border: '1px solid rgba(255,255,255,0.1)', padding: '10px 16px',
    borderRadius: '10px', fontSize: '0.85rem', outline: 'none',
    cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none',
    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' fill=\'%23888\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M8 11L3 6h10z\'/%3E%3C/svg%3E")',
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
    paddingRight: '36px', minWidth: '140px', transition: 'all 0.25s',
  };

  const activeSelectStyle = (isActive) => ({
    ...selectStyle,
    ...(isActive ? {
      borderColor: 'rgba(229,9,20,0.5)',
      background: 'rgba(229,9,20,0.08)',
    } : {}),
  });

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', paddingTop: '100px', paddingBottom: '80px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>

        {/* Page Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(229,9,20,0.2), rgba(229,9,20,0.05))', border: '1px solid rgba(229,9,20,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Film style={{ width: 24, height: 24, color: '#e50914' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, color: 'white', letterSpacing: '-1px' }}>Movies</h1>
            <p style={{ color: '#666', fontSize: '0.9rem' }}>Browse and filter movies</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '32px',
          padding: '16px 20px', borderRadius: '16px',
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(10px)', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#888', fontSize: '0.85rem', fontWeight: 600, marginRight: '8px' }}>
            <SlidersHorizontal style={{ width: 16, height: 16, color: '#e50914' }} /> Filters
          </div>

          {/* Genre Filter */}
          <select value={selectedGenre} onChange={(e) => handleFilterChange(setSelectedGenre)(e.target.value)} style={activeSelectStyle(!!selectedGenre)}>
            <option value="" style={{ background: '#141414' }}>All Genres</option>
            {genres.map(g => (<option key={g.id} value={g.id} style={{ background: '#141414' }}>{g.name}</option>))}
          </select>

          {/* Year Filter */}
          <select value={selectedYear} onChange={(e) => handleFilterChange(setSelectedYear)(e.target.value)} style={activeSelectStyle(!!selectedYear)}>
            <option value="" style={{ background: '#141414' }}>All Years</option>
            {YEARS.map(y => (<option key={y} value={y} style={{ background: '#141414' }}>{y}</option>))}
          </select>

          {/* Sort Filter */}
          <select value={selectedSort} onChange={(e) => handleFilterChange(setSelectedSort)(e.target.value)} style={activeSelectStyle(selectedSort !== 'popularity.desc')}>
            {SORT_OPTIONS.map(s => (<option key={s.value} value={s.value} style={{ background: '#141414' }}>{s.label}</option>))}
          </select>

          {/* Clear Filters */}
          {(selectedGenre || selectedYear || selectedSort !== 'popularity.desc') && (
            <button onClick={() => { setSelectedGenre(''); setSelectedYear(''); setSelectedSort('popularity.desc'); setPage(1); setMovies([]); }}
              style={{ background: 'rgba(229,9,20,0.1)', border: '1px solid rgba(229,9,20,0.3)', color: '#e50914', padding: '10px 16px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.25s' }}>
              Clear All
            </button>
          )}
        </div>

        {/* Movies Grid */}
        {movies.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '20px' }}>
            {movies.map((movie, idx) => (<MovieCard key={`${movie.id}-${idx}`} movie={movie} type="movie" />))}
          </div>
        )}

        {/* No results */}
        {!loading && movies.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#555' }}>
            <Film style={{ width: 48, height: 48, margin: '0 auto 16px', color: '#333' }} />
            <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>No movies found</p>
            <p style={{ fontSize: '0.85rem', marginTop: '8px' }}>Try adjusting your filters</p>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div style={{ width: '36px', height: '36px', border: '3px solid rgba(229,9,20,0.2)', borderTopColor: '#e50914', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Load More Button */}
        {!loading && page < totalPages && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '48px' }}>
            <button onClick={loadMore} style={{ background: 'linear-gradient(135deg, #e50914, #b20710)', color: 'white', border: 'none', padding: '14px 40px', borderRadius: '12px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: '0 4px 20px rgba(229,9,20,0.3)' }}>
              Load More Movies
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
