"use client";
import { useState, useEffect } from 'react';
import { fetchDiscoverMovies, fetchMovieGenres } from '@/lib/tmdb';
import { Film } from 'lucide-react';
import PageContainer from '@/components/PageContainer';
import PageHeader from '@/components/PageHeader';
import MediaGrid from '@/components/MediaGrid';
import LoadingSpinner from '@/components/LoadingSpinner';
import LoadMoreButton from '@/components/LoadMoreButton';
import EmptyState from '@/components/EmptyState';
import FilterBar, { getActiveSelectStyle, ClearFiltersButton } from '@/components/FilterBar';

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

  useEffect(() => {
    fetchMovieGenres().then(data => setGenres(data.genres || [])).catch(() => {});
  }, []);

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

  const handleFilterChange = (setter) => (value) => {
    setter(value);
    setPage(1);
    setMovies([]);
  };

  const loadMore = () => { if (page < totalPages) setPage(prev => prev + 1); };

  const hasActiveFilters = selectedGenre || selectedYear || selectedSort !== 'popularity.desc';

  return (
    <PageContainer>
      <PageHeader icon={Film} title="Movies" subtitle="Browse and filter movies" />

      <FilterBar>
        <select value={selectedGenre} onChange={(e) => handleFilterChange(setSelectedGenre)(e.target.value)} style={getActiveSelectStyle(!!selectedGenre)}>
          <option value="" style={{ background: '#141414' }}>All Genres</option>
          {genres.map(g => (<option key={g.id} value={g.id} style={{ background: '#141414' }}>{g.name}</option>))}
        </select>

        <select value={selectedYear} onChange={(e) => handleFilterChange(setSelectedYear)(e.target.value)} style={getActiveSelectStyle(!!selectedYear)}>
          <option value="" style={{ background: '#141414' }}>All Years</option>
          {YEARS.map(y => (<option key={y} value={y} style={{ background: '#141414' }}>{y}</option>))}
        </select>

        <select value={selectedSort} onChange={(e) => handleFilterChange(setSelectedSort)(e.target.value)} style={getActiveSelectStyle(selectedSort !== 'popularity.desc')}>
          {SORT_OPTIONS.map(s => (<option key={s.value} value={s.value} style={{ background: '#141414' }}>{s.label}</option>))}
        </select>

        {hasActiveFilters && (
          <ClearFiltersButton onClick={() => { setSelectedGenre(''); setSelectedYear(''); setSelectedSort('popularity.desc'); setPage(1); setMovies([]); }} />
        )}
      </FilterBar>

      <MediaGrid items={movies} type="movie" />

      {!loading && movies.length === 0 && (
        <EmptyState icon={Film} title="No movies found" subtitle="Try adjusting your filters" />
      )}

      {loading && <LoadingSpinner />}

      {!loading && page < totalPages && (
        <LoadMoreButton onClick={loadMore} label="Load More Movies" />
      )}
    </PageContainer>
  );
}
