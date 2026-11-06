import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { OAuth2Client } from 'google-auth-library';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 1. CORS Fix for version.json
  // This must be defined BEFORE static middleware or Vite middleware handles it
  app.get('/version.json', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // If it's an OPTIONS request, send 204 No Content
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  });

  // 2. Daily notifications, triggered by Cloud Scheduler at 9:00 Beirut time.
  // Only accepts requests carrying a Google-signed ID token for the scheduler's service account.
  const SCHEDULER_ACCOUNT = '236411176275-compute@developer.gserviceaccount.com';
  const NOTIFY_URL = 'https://richfit-236411176275.us-west1.run.app/api/notify/daily';
  const authClient = new OAuth2Client();

  app.post('/api/notify/daily', async (req, res) => {
    try {
      const token = (req.get('authorization') || '').replace(/^Bearer /, '');
      const ticket = await authClient.verifyIdToken({ idToken: token, audience: NOTIFY_URL });
      const payload = ticket.getPayload();
      if (!payload?.email_verified || payload.email !== SCHEDULER_ACCOUNT) throw new Error('wrong account');
    } catch {
      return res.status(401).json({ error: 'unauthorized' });
    }
    try {
      const { runDailyNotifications } = await import('./notifications.ts');
      const report = await runDailyNotifications();
      console.log('Daily notifications:', JSON.stringify(report));
      res.json(report);
    } catch (err: any) {
      console.error('Daily notifications failed:', err);
      res.status(500).json({ error: err?.message || 'failed' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve static files from dist
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    
    // All other routes serve index.html
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RichFit Tactical Server running at http://localhost:${PORT}`);
  });
}

startServer();
