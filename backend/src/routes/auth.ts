import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, queryOne } from '../config/db';
import { authenticate } from '../middleware/auth';
import { logger, logAction } from '../utils/logger';

export const authRouter = Router();

// ── Step 1: Login — returns user + accessible tenants ───────────────────────
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password, fcm_token } = req.body;
    const user = await queryOne(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email?.toLowerCase()]
    );
    if (!user || !await bcrypt.compare(password, user.password_hash)) {
      logAction('user.login.failed', { email: email?.toLowerCase(), ip: req.ip }, 'warn');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Temp token — no tenant/crusher yet
    const tempToken = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );

    if (fcm_token) {
      await query(
        `INSERT INTO user_sessions (user_id, token_hash, fcm_token, expires_at)
         VALUES ($1, $2, $3, now() + interval '7 days') ON CONFLICT DO NOTHING`,
        [user.id, tempToken.slice(-20), fcm_token]
      );
    }

    // platform_admin bypasses tenant/crusher selection
    if (user.role === 'platform_admin') {
      const platformToken = jwt.sign(
        { id: user.id, name: user.name, email: user.email, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );
      await query(
        `INSERT INTO user_sessions (user_id, token_hash, expires_at)
         VALUES ($1, $2, now() + interval '7 days') ON CONFLICT DO NOTHING`,
        [user.id, platformToken.slice(-20)]
      );
      logAction('user.login.platform_admin', { email: user.email, ip: req.ip });
      return res.json({
        token: platformToken,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        platform_admin: true,
      });
    }

    // Fetch tenants this user can access (via tenant-level OR crusher-level access)
    const tenants = await query(
      `SELECT DISTINCT t.id, t.name, t.logo_url,
         (SELECT COUNT(*) FROM crushers c2 WHERE c2.tenant_id = t.id AND c2.is_active = true) AS crusher_count
       FROM tenants t
       WHERE t.is_active = true AND (
         EXISTS (
           SELECT 1 FROM user_tenant_access uta
           WHERE uta.user_id = $1 AND uta.tenant_id = t.id AND uta.is_active = true
         ) OR EXISTS (
           SELECT 1 FROM user_crusher_access uca
           JOIN crushers c ON c.id = uca.crusher_id
           WHERE uca.user_id = $1 AND uca.is_active = true AND c.tenant_id = t.id
         )
       )
       ORDER BY t.name`,
      [user.id]
    );

    logAction('user.login', { email: user.email, role: user.role, tenant_count: (tenants as any[]).length, ip: req.ip });
    res.json({
      temp_token: tempToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      tenants,
    });
  } catch (err) {
    logger.error(err, 'Login error');
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Step 2: Select tenant — returns tenant-scoped token + crushers ───────────
authRouter.post('/select-tenant', authenticate, async (req, res) => {
  try {
    const { tenant_id } = req.body;
    if (!tenant_id) return res.status(400).json({ error: 'tenant_id required' });

    // Verify user has access to this tenant
    const tenant = await queryOne(
      `SELECT t.id, t.name, t.logo_url, t.legal_name, t.city, t.state
       FROM tenants t
       WHERE t.id = $1 AND t.is_active = true AND (
         EXISTS (
           SELECT 1 FROM user_tenant_access uta
           WHERE uta.user_id = $2 AND uta.tenant_id = t.id AND uta.is_active = true
         ) OR EXISTS (
           SELECT 1 FROM user_crusher_access uca
           JOIN crushers c ON c.id = uca.crusher_id
           WHERE uca.user_id = $2 AND uca.is_active = true AND c.tenant_id = t.id
         )
       )`,
      [tenant_id, req.user!.id]
    );

    if (!tenant) return res.status(403).json({ error: 'No access to this tenant' });

    // Fetch crushers in this tenant that the user can access
    const crushers = await query(
      `SELECT DISTINCT ON (c.id)
         c.id, c.name, c.legal_name, c.city, c.state, c.gstin, c.logo_url,
         COALESCE(uca.role, uta.role) AS role
       FROM crushers c
       LEFT JOIN user_crusher_access uca
         ON uca.crusher_id = c.id AND uca.user_id = $1 AND uca.is_active = true
       LEFT JOIN user_tenant_access uta
         ON uta.tenant_id = c.tenant_id AND uta.user_id = $1 AND uta.is_active = true
       WHERE c.tenant_id = $2 AND c.is_active = true
         AND (uca.id IS NOT NULL OR uta.id IS NOT NULL)
       ORDER BY c.id, c.name`,
      [req.user!.id, tenant_id]
    );

    // Tenant-scoped temp token (still no crusher_id)
    const tenantToken = jwt.sign(
      {
        id: req.user!.id, name: req.user!.name, email: req.user!.email, role: req.user!.role,
        tenant_id: (tenant as any).id, tenant_name: (tenant as any).name,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );

    logAction('user.tenant_selected', {
      userId: req.user!.id, email: req.user!.email,
      tenant: (tenant as any).name, crusher_count: (crushers as any[]).length,
    });

    res.json({ temp_token: tenantToken, tenant, crushers });
  } catch (err) {
    logger.error(err, 'select-tenant error');
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Step 3: Select crusher — returns full scoped token ───────────────────────
authRouter.post('/select-crusher', authenticate, async (req, res) => {
  try {
    const { crusher_id } = req.body;
    if (!crusher_id) return res.status(400).json({ error: 'crusher_id required' });

    const access = await queryOne(
      `SELECT COALESCE(uca.role, uta.role) AS role,
              c.id, c.name, c.legal_name, c.gstin, c.pan,
              c.address, c.city, c.state, c.state_code, c.pincode, c.phone, c.email,
              c.logo_url, c.bank_name, c.bank_account, c.bank_ifsc, c.bank_branch,
              c.invoice_prefix, c.invoice_counter, c.quarry_invoice_prefix,
              c.quarry_invoice_counter, c.terms_conditions, c.tenant_id
       FROM crushers c
       LEFT JOIN user_crusher_access uca
         ON uca.crusher_id = c.id AND uca.user_id = $1 AND uca.is_active = true
       LEFT JOIN user_tenant_access uta
         ON uta.tenant_id = c.tenant_id AND uta.user_id = $1 AND uta.is_active = true
       WHERE c.id = $2 AND c.is_active = true
         AND (uca.id IS NOT NULL OR uta.id IS NOT NULL)`,
      [req.user!.id, crusher_id]
    );

    if (!access) return res.status(403).json({ error: 'You do not have access to this crusher' });

    // Resolve tenant_name (use from token if available, else look up)
    let tenant_name = req.user!.tenant_name;
    if (!tenant_name && (access as any).tenant_id) {
      const t = await queryOne('SELECT name FROM tenants WHERE id = $1', [(access as any).tenant_id]);
      tenant_name = t ? (t as any).name : undefined;
    }

    const token = jwt.sign(
      {
        id: req.user!.id,
        name: req.user!.name,
        email: req.user!.email,
        role: (access as any).role,
        tenant_id: req.user!.tenant_id || (access as any).tenant_id,
        tenant_name,
        crusher_id: (access as any).id,
        crusher_name: (access as any).name,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    await query(
      `INSERT INTO user_sessions (user_id, token_hash, expires_at)
       VALUES ($1, $2, now() + interval '7 days') ON CONFLICT DO NOTHING`,
      [req.user!.id, token.slice(-20)]
    );

    logAction('user.crusher_selected', {
      userId: req.user!.id, email: req.user!.email,
      crusher: (access as any).name, role: (access as any).role,
    });

    const { role: _r, id: _i, tenant_id: _t, ...crusher } = access as any;
    res.json({
      token,
      user: { id: req.user!.id, name: req.user!.name, email: req.user!.email, role: (access as any).role },
      crusher,
    });
  } catch (err) {
    logger.error(err, 'select-crusher error');
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Me ───────────────────────────────────────────────────────────────────────
authRouter.get('/me', authenticate, async (req, res) => {
  const user = await queryOne('SELECT id, name, email, role, phone FROM users WHERE id = $1', [req.user!.id]);
  res.json(user);
});

// ── Change password ──────────────────────────────────────────────────────────
authRouter.post('/change-password', authenticate, async (req, res) => {
  const { current_password, new_password } = req.body;
  const user = await queryOne('SELECT * FROM users WHERE id = $1', [req.user!.id]);
  if (!user || !await bcrypt.compare(current_password, user.password_hash)) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }
  const hash = await bcrypt.hash(new_password, 10);
  await query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [hash, req.user!.id]);
  logAction('user.password_changed', { userId: req.user!.id, email: req.user!.email });
  res.json({ message: 'Password updated' });
});

// ── Logout ───────────────────────────────────────────────────────────────────
authRouter.post('/logout', authenticate, async (req, res) => {
  await query('DELETE FROM user_sessions WHERE user_id = $1', [req.user!.id]);
  logAction('user.logout', { userId: req.user!.id, email: req.user!.email });
  res.json({ message: 'Logged out' });
});
