import { Router } from 'express';
import { query, queryOne } from '../config/db';
import { authenticate } from '../middleware/auth';

export const notificationsRouter = Router();
notificationsRouter.use(authenticate);

notificationsRouter.get('/', async (req, res) => {
  const rows = await query(
    `SELECT * FROM notifications WHERE user_id = $1 OR user_id IS NULL ORDER BY sent_at DESC LIMIT 50`,
    [req.user!.id]
  );
  res.json(rows);
});

notificationsRouter.patch('/:id/read', async (req, res) => {
  await query('UPDATE notifications SET is_read = true WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

notificationsRouter.post('/mark-all-read', async (req, res) => {
  await query('UPDATE notifications SET is_read = true WHERE user_id = $1 OR user_id IS NULL', [req.user!.id]);
  res.json({ ok: true });
});

// Register/update FCM token
notificationsRouter.post('/register-device', async (req, res) => {
  const { fcm_token, device_info } = req.body;
  await query(
    `INSERT INTO user_sessions (user_id, token_hash, fcm_token, device_info, expires_at)
     VALUES ($1, $2, $3, $4, now() + interval '365 days')
     ON CONFLICT DO NOTHING`,
    [req.user!.id, fcm_token?.slice(-20), fcm_token, device_info]
  );
  res.json({ ok: true });
});
