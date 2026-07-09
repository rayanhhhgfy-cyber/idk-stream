// ╔══════════════════════════════════════════════════════════════════════╗
// ║                    🎭  CAST SECTION  🎭                            ║
// ║                                                                    ║
// ║  This component displays the cast (actors) and director for a     ║
// ║  movie or TV show. It shows circular profile photos in a          ║
// ║  horizontal scrolling row, with the director highlighted at the   ║
// ║  top.                                                              ║
// ║                                                                    ║
// ║  Clicking on an actor navigates to a search for that actor's      ║
// ║  name, showing all their other movies and TV shows.               ║
// ╚══════════════════════════════════════════════════════════════════════╝

"use client";

import Image from 'next/image';
import Link from 'next/link';
import { User, Clapperboard } from 'lucide-react';

export default function CastSection({ credits }) {
  // If no credits data, don't render anything
  if (!credits) return null;

  // Extract the director(s) from the crew
  const directors = (credits.crew || []).filter(
    c => c.job === 'Director' || c.department === 'Directing'
  ).slice(0, 3);

  // Get top 15 cast members (actors)
  const cast = (credits.cast || []).slice(0, 15);

  // If we have no cast and no director, don't show this section
  if (cast.length === 0 && directors.length === 0) return null;

  return (
    <div className="mt-8">

      {/* ── Director(s) ── */}
      {directors.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Clapperboard className="w-4 h-4 text-red-600" />
            <h4 className="text-white text-sm font-bold uppercase tracking-wider">
              {directors.length > 1 ? 'Directors' : 'Director'}
            </h4>
          </div>
          <div className="flex flex-wrap gap-3">
            {directors.map(d => (
              <Link
                key={d.id}
                href={`/search?q=${encodeURIComponent(d.name)}`}
                className="group flex items-center gap-3 bg-white/5 p-1.5 pr-4 rounded-full border border-white/5 hover:bg-red-600/10 hover:border-red-600/30 transition-all duration-300"
              >
                {/* Director Photo */}
                <div className="w-9 h-9 rounded-full overflow-hidden bg-white/5 flex-shrink-0 relative ring-2 ring-white/5 group-hover:ring-red-600/30 transition-all">
                  {d.profile_path ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w185${d.profile_path}`}
                      alt={d.name}
                      fill
                      sizes="36px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white/20" />
                    </div>
                  )}
                </div>
                <span className="text-white text-xs font-bold whitespace-nowrap">
                  {d.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Cast (Actors) ── */}
      {cast.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-5">
            <User className="w-4 h-4 text-red-600" />
            <h4 className="text-white text-sm font-bold uppercase tracking-wider">
              Top Cast
            </h4>
          </div>

          {/* Horizontal scrolling row of cast cards */}
          <div className="flex gap-6 overflow-x-auto pb-4 hide-scrollbar">
            {cast.map(actor => (
              <Link
                key={actor.id}
                href={`/search?q=${encodeURIComponent(actor.name)}`}
                className="group flex-shrink-0 w-24 text-center"
              >
                {/* Actor Photo (circular) */}
                <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-3 bg-white/5 ring-2 ring-white/5 group-hover:ring-red-600/50 group-hover:scale-105 transition-all duration-300 relative shadow-xl">
                  {actor.profile_path ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                      alt={actor.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/5 to-white/10">
                      <User className="w-7 h-7 text-white/10" />
                    </div>
                  )}
                </div>

                {/* Actor Name */}
                <p className="text-white text-[11px] font-bold truncate mb-0.5 group-hover:text-red-500 transition-colors">
                  {actor.name}
                </p>

                {/* Character Name */}
                <p className="text-gray-500 text-[10px] font-medium truncate uppercase tracking-tighter">
                  {actor.character || 'Unknown'}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
