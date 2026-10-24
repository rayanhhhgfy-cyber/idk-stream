This is a [Next.js](https://nextjs.org) streaming frontend. Playback uses the browser's native `<video>` element or `hls.js`; it does not embed third-party player pages.

## Direct source API

The app calls `/api/sources`, which proxies requests to the source server configured in the server environment. Configure the variables in `.env.example` and restart Next.js:

```bash
SOURCE_API_URL=https://your-source-server.example/api/sources
SOURCE_API_TOKEN=optional-bearer-token
SOURCE_MEDIA_ORIGINS=https://your-media-host.example
```

The configured source service receives `type` and `id`; TV requests also include `season` and `episode`. It may return either an array or an object containing `sources`/`streams`. Each source can be a URL string or an object such as:

```json
{
  "sources": [
    { "name": "1080p", "url": "https://media.example/movie.m3u8", "type": "hls", "quality": "1080p" },
    { "name": "MP4 backup", "url": "https://media.example/movie.mp4", "type": "mp4" }
  ]
}
```

Only HTTP(S) URLs are accepted. Use a source service and media URLs that you own or are authorized to distribute.

### Verified vidsrc.pm adapter

The repository also supports the verified player API exposed by vidsrc.pm. Set `SOURCE_PROVIDER=vidsrc.pm`, provide the provider-issued `VIDSRCPM_PLAYER_KEY`, and optionally configure the comma-separated source keys. Movie requests use `/api/vidora/v1/movie/{id}?source={key}`; TV requests use `/api/vidora/v1/tv/{id}/{season}/{episode}?source={key}` with the `x-player-key` header. The adapter normalizes `sources[].url`, `tracks`, and `qualities` into the native player format.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
