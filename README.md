# Karaoke Web

Static karaoke queue app using the YouTube Data API.

## Run

```powershell
python -m http.server 5173
```

Open `http://localhost:5173`.

For local development, copy `env.example.js` to `env.js` and put your YouTube Data API key there:

```js
window.KARAOKE_YOUTUBE_API_KEY = "YOUR_KEY";
```

## Deploy to Vercel

Set this Environment Variable in Vercel:

```txt
YOUTUBE_API_KEY=YOUR_KEY
```

Vercel runs `npm run build`, which creates `env.js` from that variable.

## Features

- Search embeddable YouTube karaoke videos.
- Add songs normally or as priority.
- Persistent floating singer window while searching.
- Queue controls: prioritize, move up, delete, play now.
