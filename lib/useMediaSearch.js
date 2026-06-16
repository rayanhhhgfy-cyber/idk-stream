"use client";
import { useState, useEffect, useMemo } from 'react';
import { fetchSearch } from '@/lib/tmdb';

export default function useMediaSearch(query, { limit = 24, delay = 400 } = {}) {
  const [rawResults, setRawResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const trimmedQuery = query ? query.trim() : '';

  useEffect(() => {
    if (!trimmedQuery) {
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await fetchSearch(trimmedQuery);
        if (!cancelled) {
          const filtered = (data.results || [])
            .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
            .slice(0, limit);
          setRawResults(filtered);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmedQuery, limit, delay]);

  const results = useMemo(() => trimmedQuery ? rawResults : [], [trimmedQuery, rawResults]);

  return { results, loading };
}
