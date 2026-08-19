# Pexels level downloader

## Setup

1. Get an API key from <https://www.pexels.com/api/>.
2. Copy `.env.example` to `.env.local`.
3. Add the key to `.env.local`:

```env
PEXELS_API_KEY=your_key_here
```

## Run

Start `import-pexels-levels.bat`.

Downloaded images are saved in `level-assets/images/`. Level information is
saved in `level-assets/levels.json`.
