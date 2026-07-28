require('dotenv').config();
const express = require('express');
const cors = require('cors');

const browserManager = require('./src/browser');
const userRoutes = require('./src/routes/user');
const searchRoutes = require('./src/routes/search');

const app = express();
const PORT = process.env.PORT || 4000;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // allow no-origin requests (curl, server-to-server) and configured origins
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
  })
);
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true, status: 'running' }));

app.use('/api', userRoutes);
app.use('/api', searchRoutes);

// Generic fallback - never let an unhandled error crash the process
app.use((err, req, res, next) => {
  console.error('[unhandled]', err);
  res.status(500).json({ ok: false, error: 'Internal server error.' });
});

const server = app.listen(PORT, () => {
  console.log(`Brand Research Tool backend listening on port ${PORT}`);
});

// Launch the shared Playwright browser once at boot so the first real
// search isn't slowed down by a cold start.
browserManager.init().catch((err) => {
  console.error('[browser] failed to launch at startup, will retry on first request:', err.message);
});

async function shutdown() {
  console.log('Shutting down...');
  await browserManager.shutdown().catch(() => {});
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);