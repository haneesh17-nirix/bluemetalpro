import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne } from '../config/db';
import { authenticate, authorize } from '../middleware/auth';
import { logAction } from '../utils/logger';

export const platformRouter = Router();
platformRouter.use(authenticate);
platformRouter.use(authorize('platform_admin'));

// ── Overview: all crushers + high-level stats ──────────────────────────────
platformRouter.get('/overview', async (req, res) => {
  const crushers = await query(`
    SELECT
      c.*,
      (SELECT COUNT(*) FROM user_crusher_access uca WHERE uca.crusher_id = c.id AND uca.is_active = true) AS user_count,
      (SELECT COUNT(*) FROM sales s WHERE s.crusher_id = c.id) AS sale_count,
      (SELECT COALESCE(SUM(total_amount),0) FROM sales s WHERE s.crusher_id = c.id) AS total_revenue
    FROM crushers c
    ORDER BY c.created_at DESC
  `);
  res.json(crushers);
});

// ── All users across the platform ─────────────────────────────────────────
platformRouter.get('/users', async (req, res) => {
  const users = await query(`
    SELECT u.id, u.name, u.email, u.role, u.is_active, u.created_at,
           COALESCE(
             json_agg(json_build_object('crusher_id', uca.crusher_id, 'crusher_name', c.name, 'role', uca.role))
             FILTER (WHERE uca.crusher_id IS NOT NULL), '[]'
           ) AS crusher_access
    FROM users u
    LEFT JOIN user_crusher_access uca ON uca.user_id = u.id AND uca.is_active = true
    LEFT JOIN crushers c ON c.id = uca.crusher_id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `);
  res.json(users);
});

// ── Create a new crusher (with optional first admin user) ─────────────────
platformRouter.post('/crushers', async (req, res) => {
  const {
    name, legal_name, gstin, pan, address, city, state, state_code, pincode,
    phone, email, bank_name, bank_account, bank_ifsc, bank_branch,
    invoice_prefix, quarry_invoice_prefix, terms_conditions,
    admin_name, admin_email, admin_password,
  } = req.body;

  if (!name) return res.status(400).json({ error: 'name is required' });

  const crusher = await queryOne(
    `INSERT INTO crushers (name, legal_name, gstin, pan, address, city, state, state_code, pincode,
       phone, email, bank_name, bank_account, bank_ifsc, bank_branch,
       invoice_prefix, quarry_invoice_prefix, terms_conditions)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
    [name, legal_name, gstin, pan, address, city, state, state_code, pincode,
     phone, email, bank_name, bank_account, bank_ifsc, bank_branch,
     invoice_prefix || 'INV', quarry_invoice_prefix || 'QRY', terms_conditions]
  );
  const crusherId = (crusher as any).id;

  let adminUser = null;
  if (admin_email && admin_password) {
    const hash = await bcrypt.hash(admin_password, 10);
    adminUser = await queryOne(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, 'admin', true)
       ON CONFLICT (email) DO UPDATE SET updated_at = now() RETURNING *`,
      [admin_name || 'Admin', admin_email, hash]
    );
    await query(
      `INSERT INTO user_crusher_access (user_id, crusher_id, role)
       VALUES ($1, $2, 'admin') ON CONFLICT (user_id, crusher_id) DO NOTHING`,
      [(adminUser as any).id, crusherId]
    );
  }

  logAction('platform.crusher.created', { name, city, by: req.user!.email });
  res.status(201).json({ crusher, admin_user: adminUser ? { id: (adminUser as any).id, email: (adminUser as any).email } : null });
});

// ── Get users for a crusher ───────────────────────────────────────────────
platformRouter.get('/crushers/:id/users', async (req, res) => {
  const rows = await query(
    `SELECT u.id, u.name, u.email, u.is_active, uca.role, uca.created_at as access_granted
     FROM user_crusher_access uca
     JOIN users u ON u.id = uca.user_id
     WHERE uca.crusher_id = $1 AND uca.is_active = true
     ORDER BY uca.role, u.name`,
    [req.params.id]
  );
  res.json(rows);
});

// ── Add user to a crusher ────────────────────────────────────────────────
platformRouter.post('/crushers/:id/users', async (req, res) => {
  const { user_id, role } = req.body;
  if (!user_id || !role) return res.status(400).json({ error: 'user_id and role required' });
  await query(
    `INSERT INTO user_crusher_access (user_id, crusher_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, crusher_id) DO UPDATE SET role = $3, is_active = true`,
    [user_id, req.params.id, role]
  );
  logAction('platform.user.access.granted', { user_id, crusher_id: req.params.id, role, by: req.user!.email });
  res.json({ ok: true });
});

// ── Remove user from a crusher ───────────────────────────────────────────
platformRouter.delete('/crushers/:crusherId/users/:userId', async (req, res) => {
  await query(
    `UPDATE user_crusher_access SET is_active = false
     WHERE crusher_id = $1 AND user_id = $2`,
    [req.params.crusherId, req.params.userId]
  );
  logAction('platform.user.access.revoked', { user_id: req.params.userId, crusher_id: req.params.crusherId, by: req.user!.email });
  res.json({ ok: true });
});

// ── Deactivate / activate a crusher ──────────────────────────────────────
platformRouter.patch('/crushers/:id/status', async (req, res) => {
  const { is_active } = req.body;
  await query('UPDATE crushers SET is_active = $1, updated_at = now() WHERE id = $2', [is_active, req.params.id]);
  logAction('platform.crusher.status', { crusher_id: req.params.id, is_active, by: req.user!.email });
  res.json({ ok: true });
});

// ── Create a new user and optionally assign to a crusher ─────────────────
platformRouter.post('/users', async (req, res) => {
  const { name, email, password, role, crusher_id, crusher_role } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password required' });
  const hash = await bcrypt.hash(password, 10);
  const user = await queryOne(
    `INSERT INTO users (name, email, password_hash, role, is_active)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (email) DO UPDATE SET updated_at = now() RETURNING *`,
    [name, email, hash, role || 'sales_operator']
  );
  if (crusher_id) {
    await query(
      `INSERT INTO user_crusher_access (user_id, crusher_id, role)
       VALUES ($1, $2, $3) ON CONFLICT (user_id, crusher_id) DO NOTHING`,
      [(user as any).id, crusher_id, crusher_role || role || 'sales_operator']
    );
  }
  logAction('platform.user.created', { email, role, by: req.user!.email });
  res.status(201).json({ id: (user as any).id, email: (user as any).email, role: (user as any).role });
});
