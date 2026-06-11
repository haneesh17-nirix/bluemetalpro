import { Router } from 'express';
import { query, queryOne } from '../config/db';
import { authenticate, requireCrusher } from '../middleware/auth';
import { logger, logAction } from '../utils/logger';
import { registerSSEClient, removeSSEClient } from '../services/notifyService';

export const notificationsRouter = Router();
notificationsRouter.use(authenticate);
notificationsRouter.use(requireCrusher);

notificationsRouter.get('/', async (req, res) => {
  const cid = req.user!.crusher_id!;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  try {
    const rows = await query(
      `SELECT * FROM notifications WHERE user_id = $1 AND crusher_id = $2 ORDER BY sent_at DESC LIMIT $3`,
      [req.user!.id, cid, limit]
    );
    res.json(rows);
  } catch (err) {
    logger.error({ err, userId: req.user!.id, crusher_id: cid }, 'Failed to fetch notifications');
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

notificationsRouter.get('/unread-count', async (req, res) => {
  const cid = req.user!.crusher_id!;
  try {
    const row = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND crusher_id = $2 AND is_read = false`,
      [req.user!.id, cid]
    );
    res.json({ count: parseInt(row?.count ?? '0') });
  } catch (err) {
    logger.error({ err, userId: req.user!.id, crusher_id: cid }, 'Failed to fetch unread count');
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// SSE stream — GET /api/notifications/stream
notificationsRouter.get('/stream', (req, res) => {
  const cid = req.user!.crusher_id!;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
  res.flushHeaders();
  res.write(': connected\n\n');

  logger.info({ userId: req.user!.id, crusher_id: cid }, 'SSE client connected');
  registerSSEClient(cid, res);

  // Heartbeat every 30s to keep connection alive
  const heartbeat = setInterval(() => {
    try { res.write(': ping\n\n'); } catch { clearInterval(heartbeat); }
  }, 30_000);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeSSEClient(cid, res);
    logger.info({ userId: req.user!.id, crusher_id: cid }, 'SSE client disconnected');
  });
});

notificationsRouter.patch('/:id/read', async (req, res) => {
  try {
    await query('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 AND crusher_id = $3', [req.params.id, req.user!.id, req.user!.crusher_id]);
    logAction('notifications.marked_read', { userId: req.user!.id, notificationId: req.params.id, crusher_id: req.user!.crusher_id });
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err, notificationId: req.params.id, userId: req.user!.id, crusher_id: req.user!.crusher_id }, 'Failed to mark notification read');
    res.status(500).json({ error: 'Failed to mark notification read' });
  }
});

notificationsRouter.post('/mark-all-read', async (req, res) => {
  const cid = req.user!.crusher_id!;
  try {
    await query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND crusher_id = $2',
      [req.user!.id, cid]
    );
    logAction('notifications.marked_all_read', { userId: req.user!.id, crusher_id: cid });
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err, userId: req.user!.id, crusher_id: cid }, 'Failed to mark all notifications read');
    res.status(500).json({ error: 'Failed to mark all notifications read' });
  }
});

// Register/update FCM token
notificationsRouter.post('/register-device', async (req, res) => {
  const { fcm_token, device_info } = req.body;
  try {
    await query(
      `INSERT INTO user_sessions (user_id, token_hash, fcm_token, device_info, expires_at)
       VALUES ($1, $2, $3, $4, now() + interval '365 days')
       ON CONFLICT DO NOTHING`,
      [req.user!.id, fcm_token?.slice(-20), fcm_token, device_info]
    );
    logAction('notifications.device_registered', { userId: req.user!.id, device: req.body.device_info });
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err, userId: req.user!.id, device: req.body.device_info }, 'Failed to register device token');
    res.status(500).json({ error: 'Failed to register device token' });
  }
});
