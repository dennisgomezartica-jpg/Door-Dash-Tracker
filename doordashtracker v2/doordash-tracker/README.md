# DoorDash Tracker — Newnan GA

A mobile-first earnings tracker for DoorDash drivers.

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher

### Run locally
```bash
npm install
npm run dev
```
Then open http://localhost:5173 in your browser.

### Build for production
```bash
npm run build
```

### Deploy to Vercel
1. Push this folder to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and import the repo
3. Vercel auto-detects Vite — just click Deploy
4. Your live URL will be ready in ~1 minute

## Features
- Log DoorDash sessions manually
- Import DoorDash ZIP archive
- Analytics by time window, day, weather, and city
- Weekly/monthly earnings goals
- Net profit after mileage deduction & SE tax
- Export to CSV / Excel
