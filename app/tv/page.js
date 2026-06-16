"use client";
import { useState, useEffect } from 'react';
import { fetchDiscoverTV, fetchTVGenres } from '@/lib/tmdb';
import { Monitor } from 'lucide-react';
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
  { value: 'first_air_date.desc', label: 'Newest First' },
  { value: 'first_air_date.asc', label: 'Oldest First' },
  { value: 'name.asc', label: 'Title A-Z' },
];

const YEARS = Array.from({ length: 56 }, (_, i) => 2025 - i);

export default function TVPage() {
  const [shows, setShows] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [genres, setGenres] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSort, setSelectedSort] = useState('popularity.desc');

  useEffect(() => {
    fetchTVGenres().then(data => setGenres(data.genres || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const loadShows = async () => {
      setLoading(true);
      try {
        const data = await fetchDiscoverTV(page, {
          genre: selectedGenre, year: selectedYear, sortBy: selectedSort,
        });
        setShows(prev => page === 1 ? data.results : [...prev, ...data.results]);
        setTotalPages(data.total_pages);
      } catch (err) { console.error('Error loading TV shows:', err); }
      finally { setLoading(false); }
    };
    loadShows();
  }, [page, selectedGenre, selectedYear, selectedSort]);

  const handleFilterChange = (setter) => (value) => {
    setter(value);
    setPage(1);
    setShows([]);
  };

  const loadMore = () => { if (page < totalPages) setPage(prev => prev + 1); };

  const hasActiveFilters = selectedGenre || selectedYear || selectedSort !== 'popularity.desc';

  return (
    <PageContainer>
      <PageHeader icon={Monitor} title="TV Shows" subtitle="Browse and filter TV shows" />

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
          <ClearFiltersButton onClick={() => { setSelectedGenre(''); setSelectedYear(''); setSelectedSort('popularity.desc'); setPage(1); setShows([]); }} />
        )}
      </FilterBar>

      <MediaGrid items={shows} type="tv" />

      {!loading && shows.length === 0 && (
        <EmptyState icon={Monitor} title="No TV shows found" subtitle="Try adjusting your filters" />
      )}

      {loading && <LoadingSpinner />}

      {!loading && page < totalPages && (
        <LoadMoreButton onClick={loadMore} label="Load More TV Shows" />
      )}
    </PageContainer>
  );
}
