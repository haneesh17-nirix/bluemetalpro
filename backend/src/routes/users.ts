import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne } from '../config/db';
import { authenticate, authorize } from '../middleware/auth';
import { logger, logAction } from '../utils/logger';

export const usersRouter = Router();
usersRouter.use(authenticate);

// ── Self-service routes (any authenticated user) ─────────────────────────────
usersRouter.get('/me', async (req, res) => {
  try {
    const user = await queryOne(
      `SELECT id, name, email, phone, role, notify_events FROM users WHERE id = $1`,
      [req.user!.id]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    logger.error({ err, userId: req.user!.id }, 'Failed to fetch current user');
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

usersRouter.patch('/me', async (req, res) => {
  const { notify_events } = req.body;
  const allowed = ['sale','purchase','maintenance','quarry','wages','vehicle','party','weighbridge','ledger'];
  const filtered = Array.isArray(notify_events)
    ? notify_events.filter((e: string) => allowed.includes(e))
    : null;
  try {
    const user = await queryOne(
      `UPDATE users SET notify_events = $1, updated_at = now() WHERE id = $2
       RETURNING id, name, email, phone, role, notify_events`,
      [filtered, req.user!.id]
    );
    logAction('user.notify_prefs_updated', { userId: req.user!.id, notify_events: filtered });
    res.json(user);
  } catch (err) {
    logger.error({ err, userId: req.user!.id, notify_events: filtered }, 'Failed to update notify prefs');
    res.status(500).json({ error: 'Failed to update notify prefs' });
  }
});

// ── Admin-only routes below ──────────────────────────────────────────────────
usersRouter.use(authorize('admin'));

usersRouter.get('/', async (req, res) => {
  try {
    const rows = await query(
      `SELECT DISTINCT u.id, u.name, u.email, u.phone, u.role, u.is_active, u.created_at
       FROM users u
       JOIN user_crusher_access uca ON uca.user_id = u.id
       WHERE uca.crusher_id IN (SELECT crusher_id FROM user_crusher_access WHERE user_id = $1)
       ORDER BY u.name`,
      [req.user!.id]
    );
    res.json(rows);
  } catch (err) {
    logger.error({ err, userId: req.user!.id }, 'Failed to list users');
    res.status(500).json({ error: 'Failed to list users' });
  }
});

usersRouter.get('/by-crusher/:crusher_id', async (req, res) => {
  try {
    const rows = await query(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.is_active, u.created_at
       FROM users u
       JOIN user_crusher_access uc ON uc.user_id = u.id
       WHERE uc.crusher_id = $1
       ORDER BY u.name`,
      [req.params.crusher_id]
    );
    res.json(rows);
  } catch (err) {
    logger.error({ err, crusher_id: req.params.crusher_id, userId: req.user!.id }, 'Failed to list users by crusher');
    res.status(500).json({ error: 'Failed to list users by crusher' });
  }
});

usersRouter.post('/', async (req, res) => {
  const { name, email, phone, role, password } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const user = await queryOne(
      `INSERT INTO users (name, email, phone, role, password_hash, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, name, email, phone, role, is_active`,
      [name, email.toLowerCase(), phone, role, hash, req.user!.id]
    );
    logAction('user.created', { name, email, role, by: req.user!.email });
    res.status(201).json(user);
  } catch (err: any) {
    if (err?.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    logger.error({ err, email, role, by: req.user!.email }, 'Failed to create user');
    res.status(500).json({ error: 'Failed to create user' });
  }
});

usersRouter.put('/:id', async (req, res) => {
  const { name, phone, role, is_active } = req.body;
  if (role === 'platform_admin') return res.status(403).json({ error: 'Forbidden' });
  try {
    const user = await queryOne(
      `UPDATE users SET name=$1, phone=$2, role=$3, is_active=$4, updated_at=now()
       WHERE id=$5 RETURNING id, name, email, phone, role, is_active`,
      [name, phone, role, is_active, req.params.id]
    );
    if (!user) {
      logger.warn({ targetUserId: req.params.id }, 'User not found for update');
      return res.status(404).json({ error: 'User not found' });
    }
    logAction('user.updated', { userId: req.params.id, role, is_active, by: req.user!.email });
    res.json(user);
  } catch (err) {
    logger.error({ err, targetUserId: req.params.id, by: req.user!.email }, 'Failed to update user');
    res.status(500).json({ error: 'Failed to update user' });
  }
});

usersRouter.patch('/:id', async (req, res) => {
  const allowed = ['name', 'phone', 'role', 'is_active'];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  if (updates.role === 'platform_admin') return res.status(403).json({ error: 'Forbidden' });
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update' });
  const setClauses = Object.keys(updates).map((k, i) => `${k}=$${i + 1}`).join(', ');
  const values = [...Object.values(updates), req.params.id];
  try {
    const user = await queryOne(
      `UPDATE users SET ${setClauses}, updated_at=now() WHERE id=$${values.length} RETURNING id, name, email, phone, role, is_active`,
      values
    );
    if (!user) {
      logger.warn({ targetUserId: req.params.id }, 'User not found for patch');
      return res.status(404).json({ error: 'User not found' });
    }
    logAction('user.updated', { userId: req.params.id, ...updates, by: req.user!.email });
    res.json(user);
  } catch (err) {
    logger.error({ err, targetUserId: req.params.id, updates, by: req.user!.email }, 'Failed to patch user');
    res.status(500).json({ error: 'Failed to patch user' });
  }
});

usersRouter.post('/:id/reset-password', async (req, res) => {
  const { password } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    await query('UPDATE users SET password_hash=$1, updated_at=now() WHERE id=$2', [hash, req.params.id]);
    logAction('user.password_reset', { targetUserId: req.params.id, by: req.user!.email });
    res.json({ message: 'Password reset' });
  } catch (err) {
    logger.error({ err, targetUserId: req.params.id, by: req.user!.email }, 'Failed to reset password');
    res.status(500).json({ error: 'Failed to reset password' });
  }
});
