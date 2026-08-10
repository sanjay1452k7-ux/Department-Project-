import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { attachUser } from './auth.js';
import { authRouter } from './routes/auth.js';
import { hackathonsRouter } from './routes/hackathons.js';
import { winnersRouter } from './routes/winners.js';
import { feedbackRouter } from './routes/feedback.js';
import { notificationsRouter } from './routes/notifications.js';
import { chatRouter, searchRouter, statsRouter } from './routes/misc.js';
import { HttpError } from './util.js';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '256kb' }));
  app.use(attachUser);

  app.get('/api/health', (_req, res) => res.json({ ok: true, env: config.nodeEnv }));
  app.use('/api/auth', authRouter);
  app.use('/api/hackathons', hackathonsRouter);
  app.use('/api/winners', winnersRouter);
  app.use('/api/feedback', feedbackRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/chat', chatRouter);
  app.use('/api/stats', statsRouter);

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Unknown endpoint' }));

  // Serve the built PWA when it exists, with SPA fallback.
  if (fs.existsSync(config.webDist)) {
    app.use(express.static(config.webDist));
    app.get('*', (_req, res) => res.sendFile(path.join(config.webDist, 'index.html')));
  }

  app.use((err, _req, res, _next) => {
    const status = err instanceof HttpError ? err.status : 500;
    if (status >= 500) console.error(err);
    res.status(status).json({
      error: status >= 500 ? 'Something went wrong on our side' : err.message,
      details: err.details,
    });
  });

  return app;
}
