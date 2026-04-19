# Timer Manager

A simple React single-page timer app with local SQLite persistence and Google sign-in support.

## Run locally

1. Install dependencies

```bash
npm install
```

2. Start the backend server

```bash
npm run server
```

3. Start the React app

```bash
npm run dev
```

4. Open `http://localhost:3000`

## Notes

- The app uses a local SQLite database stored in `data/timers.db`.
- Google sign-in is enabled via `https://accounts.google.com/gsi/client`.
- Replace `YOUR_GOOGLE_CLIENT_ID` in `src/App.jsx` and `server.js` with your Google OAuth client ID to enable full authentication validation.
- The UI includes an analog clock, task list, pause/resume, and bar chart for success/stop rates.
