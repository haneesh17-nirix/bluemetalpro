import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne } from '../config/db';
import { authenticate, authorize } from '../middleware/auth';
import { logAction } from '../utils/logger';

export const platformRouter = Router();
platformRouter.use(authenticate);
platformRouter.use(authorize('platform_admin'));

// ══════════════════════════════════════════════════════════════════════════════
// TENANT MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

// ── List all tenants with stats ───────────────────────────────────────────────
platformRouter.get('/tenants', async (req, res) => {
  try {
    const tenants = await query(`
      SELECT t.*,
        (SELECT COUNT(*) FROM crushers c WHERE c.tenant_id = t.id AND c.is_active = true) AS crusher_count,
        (SELECT COUNT(*) FROM user_tenant_access uta WHERE uta.tenant_id = t.id AND uta.is_active = true) AS user_count,
        (SELECT COALESCE(SUM(s.total_amount), 0)
           FROM sales s JOIN crushers c ON c.id = s.crusher_id WHERE c.tenant_id = t.id) AS total_revenue
      FROM tenants t
      ORDER BY t.created_at DESC
    `);
    res.json(tenants);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── Get single tenant ─────────────────────────────────────────────────────────
platformRouter.get('/tenants/:id', async (req, res) => {
  try {
    const tenant = await queryOne('SELECT * FROM tenants WHERE id = $1', [req.params.id]);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    res.json(tenant);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── Create tenant (with optional first crusher + admin user) ──────────────────
platformRouter.post('/tenants', async (req, res) => {
  try {
    const {
      name, legal_name, gstin, pan, address, city, state, phone, email, plan, logo_url,
      // Optional first crusher
      crusher_name, crusher_city, crusher_state, crusher_gstin,
      crusher_invoice_prefix, crusher_quarry_prefix,
      // Optional admin user for this tenant
      admin_name, admin_email, admin_password,
    } = req.body;

    if (!name) return res.status(400).json({ error: 'name is required' });

    const tenant = await queryOne(
      `INSERT INTO tenants (name, legal_name, gstin, pan, address, city, state, phone, email, plan, logo_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [name, legal_name, gstin, pan, address, city, state, phone, email, plan || 'standard', logo_url]
    );
    const tenantId = (tenant as any).id;

    let crusher = null;
    if (crusher_name) {
      crusher = await queryOne(
        `INSERT INTO crushers
           (tenant_id, name, legal_name, gstin, city, state,
            invoice_prefix, quarry_invoice_prefix)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [tenantId, crusher_name, legal_name, crusher_gstin || gstin,
         crusher_city || city, crusher_state || state,
         crusher_invoice_prefix || 'INV', crusher_quarry_prefix || 'QRY']
      );
    }

    let adminUser = null;
    if (admin_email && admin_password && crusher) {
      const hash = await bcrypt.hash(admin_password, 10);
      adminUser = await queryOne(
        `INSERT INTO users (name, email, password_hash, role, is_active)
         VALUES ($1,$2,$3,'admin',true)
         ON CONFLICT (email) DO NOTHING RETURNING *`,
        [admin_name || 'Admin', admin_email, hash]
      );
      if (!adminUser) return res.status(409).json({ error: 'Email already in use' });
      await query(
        `INSERT INTO user_tenant_access (user_id, tenant_id, role)
         VALUES ($1,$2,'admin') ON CONFLICT (user_id, tenant_id) DO NOTHING`,
        [(adminUser as any).id, tenantId]
      );
    }

    logAction('platform.tenant.created', { name, by: req.user!.email });
    res.status(201).json({
      tenant,
      crusher,
      admin_user: adminUser ? { id: (adminUser as any).id, email: (adminUser as any).email } : null,
    });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── Update tenant ─────────────────────────────────────────────────────────────
platformRouter.put('/tenants/:id', async (req, res) => {
  try {
    const { name, legal_name, gstin, pan, address, city, state, phone, email, plan, logo_url } = req.body;
    const tenant = await queryOne(
      `UPDATE tenants SET
         name=$1, legal_name=$2, gstin=$3, pan=$4, address=$5,
         city=$6, state=$7, phone=$8, email=$9, plan=$10, logo_url=$11,
         updated_at=now()
       WHERE id=$12 RETURNING *`,
      [name, legal_name, gstin, pan, address, city, state, phone, email, plan, logo_url, req.params.id]
    );
    logAction('platform.tenant.updated', { id: req.params.id, by: req.user!.email });
    res.json(tenant);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── Activate / deactivate tenant ──────────────────────────────────────────────
platformRouter.patch('/tenants/:id/status', async (req, res) => {
  try {
    const { is_active } = req.body;
    await query('UPDATE tenants SET is_active=$1, updated_at=now() WHERE id=$2', [is_active, req.params.id]);
    logAction('platform.tenant.status', { id: req.params.id, is_active, by: req.user!.email });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── List crushers for a tenant ────────────────────────────────────────────────
platformRouter.get('/tenants/:id/crushers', async (req, res) => {
  try {
    const crushers = await query(
      `SELECT c.*,
         (SELECT COUNT(*) FROM user_crusher_access uca WHERE uca.crusher_id = c.id AND uca.is_active = true) AS user_count,
         (SELECT COUNT(*) FROM sales s WHERE s.crusher_id = c.id) AS sale_count,
         (SELECT COALESCE(SUM(total_amount),0) FROM sales s WHERE s.crusher_id = c.id) AS total_revenue
       FROM crushers c WHERE c.tenant_id = $1 ORDER BY c.created_at`,
      [req.params.id]
    );
    res.json(crushers);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── Add crusher to tenant ─────────────────────────────────────────────────────
platformRouter.post('/tenants/:id/crushers', async (req, res) => {
  try {
    const {
      name, legal_name, gstin, pan, address, city, state, state_code, pincode,
      phone, email, bank_name, bank_account, bank_ifsc, bank_branch,
      invoice_prefix, quarry_invoice_prefix, terms_conditions,
    } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const crusher = await queryOne(
      `INSERT INTO crushers
         (tenant_id, name, legal_name, gstin, pan, address, city, state, state_code, pincode,
          phone, email, bank_name, bank_account, bank_ifsc, bank_branch,
          invoice_prefix, quarry_invoice_prefix, terms_conditions)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       RETURNING *`,
      [req.params.id, name, legal_name, gstin, pan, address, city, state, state_code, pincode,
       phone, email, bank_name, bank_account, bank_ifsc, bank_branch,
       invoice_prefix || 'INV', quarry_invoice_prefix || 'QRY', terms_conditions]
    );
    logAction('platform.crusher.created', { tenant_id: req.params.id, name, by: req.user!.email });
    res.status(201).json(crusher);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── Add user to tenant ────────────────────────────────────────────────────────
platformRouter.post('/tenants/:id/users', async (req, res) => {
  try {
    const { user_id, role } = req.body;
    if (!user_id || !role) return res.status(400).json({ error: 'user_id and role required' });
    await query(
      `INSERT INTO user_tenant_access (user_id, tenant_id, role)
       VALUES ($1,$2,$3)
       ON CONFLICT (user_id, tenant_id) DO UPDATE SET role=$3, is_active=true`,
      [user_id, req.params.id, role]
    );
    logAction('platform.tenant.user.added', { user_id, tenant_id: req.params.id, role, by: req.user!.email });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── Overview: all crushers + high-level stats ──────────────────────────────
platformRouter.get('/overview', async (req, res) => {
  try {
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
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── All users across the platform ─────────────────────────────────────────
platformRouter.get('/users', async (req, res) => {
  try {
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
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── Create a new crusher (with optional first admin user) ─────────────────
platformRouter.post('/crushers', async (req, res) => {
  try {
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
         ON CONFLICT (email) DO NOTHING RETURNING *`,
        [admin_name || 'Admin', admin_email, hash]
      );
      if (!adminUser) return res.status(409).json({ error: 'Email already in use' });
      await query(
        `INSERT INTO user_crusher_access (user_id, crusher_id, role)
         VALUES ($1, $2, 'admin') ON CONFLICT (user_id, crusher_id) DO NOTHING`,
        [(adminUser as any).id, crusherId]
      );
    }

    logAction('platform.crusher.created', { name, city, by: req.user!.email });
    res.status(201).json({ crusher, admin_user: adminUser ? { id: (adminUser as any).id, email: (adminUser as any).email } : null });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── Get users for a crusher ───────────────────────────────────────────────
platformRouter.get('/crushers/:id/users', async (req, res) => {
  try {
    const rows = await query(
      `SELECT u.id, u.name, u.email, u.is_active, uca.role, uca.created_at as access_granted
       FROM user_crusher_access uca
       JOIN users u ON u.id = uca.user_id
       WHERE uca.crusher_id = $1 AND uca.is_active = true
       ORDER BY uca.role, u.name`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── Add user to a crusher ────────────────────────────────────────────────
platformRouter.post('/crushers/:id/users', async (req, res) => {
  try {
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
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── Remove user from a crusher ───────────────────────────────────────────
platformRouter.delete('/crushers/:crusherId/users/:userId', async (req, res) => {
  try {
    await query(
      `UPDATE user_crusher_access SET is_active = false
       WHERE crusher_id = $1 AND user_id = $2`,
      [req.params.crusherId, req.params.userId]
    );
    logAction('platform.user.access.revoked', { user_id: req.params.userId, crusher_id: req.params.crusherId, by: req.user!.email });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── Deactivate / activate a crusher ──────────────────────────────────────
platformRouter.patch('/crushers/:id/status', async (req, res) => {
  try {
    const { is_active } = req.body;
    await query('UPDATE crushers SET is_active = $1, updated_at = now() WHERE id = $2', [is_active, req.params.id]);
    logAction('platform.crusher.status', { crusher_id: req.params.id, is_active, by: req.user!.email });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── Create a new user and optionally assign to a crusher ─────────────────
platformRouter.post('/users', async (req, res) => {
  try {
    const { name, email, password, role, crusher_id, crusher_role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password required' });
    const hash = await bcrypt.hash(password, 10);
    const user = await queryOne(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (email) DO NOTHING RETURNING *`,
      [name, email, hash, role || 'operations']
    );
    if (!user) return res.status(409).json({ error: 'Email already in use' });
    if (crusher_id) {
      await query(
        `INSERT INTO user_crusher_access (user_id, crusher_id, role)
         VALUES ($1, $2, $3) ON CONFLICT (user_id, crusher_id) DO NOTHING`,
        [(user as any).id, crusher_id, crusher_role || role || 'operations']
      );
    }
    logAction('platform.user.created', { email, role, by: req.user!.email });
    res.status(201).json({ id: (user as any).id, email: (user as any).email, role: (user as any).role });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});
