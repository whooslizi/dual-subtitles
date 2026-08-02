# Dual Subtitles Addon

A lightweight Stremio/Nuvio addon that scrapes and merges two subtitle languages simultaneously for movies, series, and anime.

## Quick Start

### 1. Run Locally
```bash
npm install
npm start
```
Open `http://localhost:7000` in your browser to configure languages and install the addon into Stremio.

### 2. Run Tests
```bash
npm test
```

### 3. Deploy to Vercel
Deploy with 1-click on Vercel using `server.js` as the serverless entrypoint.

## Project Structure

```
├── scrapers/          # OpenSubtitles, Vietsub, and Subdl scrapers
├── lib/               # Sync engine, source selection, analytics, & persistence
├── addon.js           # Stremio manifest & subtitle handlers
├── server.js          # Express server & Vercel entrypoint
└── landingTemplate.js # Minimal web configuration interface
```

## Credits & Acknowledgments

Built using open APIs and community subtitle providers:
- [OpenSubtitles v3](https://opensubtitles-v3.strem.io)
- [Subdl](https://subdl.com) & SubSource
- [Anime Relations (ARM API)](https://arm.haglund.dev)
- [Stremio Addon SDK](https://github.com/Stremio/stremio-addon-sdk)
- [Stremio Dual Subtitles by ummugulsunn](https://github.com/ummugulsunn/stremio-dual-subtitles)
