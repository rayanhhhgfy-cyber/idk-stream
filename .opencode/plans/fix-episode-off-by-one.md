# Fixes

## Fix 1: Episode Off-By-One in Embed Providers

### Problem
Selecting episode X plays episode X+1. TMDB uses 1-based episode numbering but the embed providers (vidsrc.to, vidking.net, embed.su, vidsrc.pro) use 0-based indexing.

### Change — `components/PlayerContainer.js:40-53`
Replace `${episode}` with `${Number(episode) - 1}` in all four TV embed URLs:

- Line 40: `` `https://vidsrc.to/embed/tv/${id}/${season}/${Number(episode) - 1}` ``
- Line 44: `` `https://www.vidking.net/embed/tv/${id}/${season}/${Number(episode) - 1}` ``
- Line 48: `` `https://embed.su/embed/tv/${id}/${season}/${Number(episode) - 1}` ``
- Line 52: `` `https://vidsrc.pro/embed/tv/${id}/${season}/${Number(episode) - 1}` ``

---

## Fix 2: Remove Broken "Resume from X" Feature

### Problem
The "Resume from X" badge doesn't work (can't seek into embed iframes) and shows inaccurate data.

### Changes — `app/watch/[type]/[id]/page.js`

1. **Line 11**: Remove `Clock` from lucide-react import
2. **Line 4**: Remove `formatWatchTime` from watchHistory import
3. **Line 29**: Remove `resumeInfo` state (`const [resumeInfo, setResumeInfo] = useState(null)`)
4. **Lines 107-116**: Remove the entire "Resume playback" useEffect block
5. **Lines 316-353**: Remove the entire `<button>` block for the resume badge

---

## Files modified
- `components/PlayerContainer.js`
- `app/watch/[type]/[id]/page.js`
