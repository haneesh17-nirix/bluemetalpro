import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, queryOne } from '../config/db';
import { authenticate } from '../middleware/auth';
import { logger, logAction } from '../utils/logger';

export const authRouter = Router();

// ── Step 1: Login — returns user + list of accessible crushers ───────────────
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

    // Temp token — no crusher_id yet
    const tempToken = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }   // short-lived until crusher is selected
    );

    // Fetch accessible crushers
    const crushers = await query(
      `SELECT DISTINCT ON (c.id) c.id, c.name, c.legal_name, c.city, c.state, c.gstin, c.logo_url, uca.role
       FROM user_crusher_access uca
       JOIN crushers c ON c.id = uca.crusher_id
       WHERE uca.user_id = $1 AND uca.is_active = true AND c.is_active = true
       ORDER BY c.id, c.name`,
      [user.id]
    );

    if (fcm_token) {
      await query(
        `INSERT INTO user_sessions (user_id, token_hash, fcm_token, expires_at)
         VALUES ($1, $2, $3, now() + interval '7 days')
         ON CONFLICT DO NOTHING`,
        [user.id, tempToken.slice(-20), fcm_token]
      );
    }

    // platform_admin bypasses crusher selection — issue a full token immediately
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
        crushers: [],
        platform_admin: true,
      });
    }

    logAction('user.login', { email: user.email, role: user.role, crusher_count: crushers.length, ip: req.ip });
    res.json({
      temp_token: tempToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      crushers,
    });
  } catch (err) {
    logger.error(err, 'Login error');
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Step 2: Select crusher — returns full crusher-scoped token ───────────────
authRouter.post('/select-crusher', authenticate, async (req, res) => {
  try {
    const { crusher_id } = req.body;
    if (!crusher_id) return res.status(400).json({ error: 'crusher_id required' });

    const access = await queryOne(
      `SELECT uca.role, c.id, c.name, c.legal_name, c.gstin, c.pan,
              c.address, c.city, c.state, c.state_code, c.pincode, c.phone, c.email,
              c.logo_url, c.bank_name, c.bank_account, c.bank_ifsc, c.bank_branch,
              c.invoice_prefix, c.invoice_counter, c.quarry_invoice_prefix,
              c.quarry_invoice_counter, c.terms_conditions
       FROM user_crusher_access uca
       JOIN crushers c ON c.id = uca.crusher_id
       WHERE uca.user_id = $1 AND uca.crusher_id = $2 AND uca.is_active = true AND c.is_active = true`,
      [req.user!.id, crusher_id]
    );

    if (!access) {
      return res.status(403).json({ error: 'You do not have access to this crusher' });
    }

    // Full token with crusher context — long-lived
    const token = jwt.sign(
      {
        id: req.user!.id,
        name: req.user!.name,
        email: req.user!.email,
        role: (access as any).role,
        crusher_id: (access as any).id,
        crusher_name: (access as any).name,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // Save session
    await query(
      `INSERT INTO user_sessions (user_id, token_hash, expires_at)
       VALUES ($1, $2, now() + interval '7 days')
       ON CONFLICT DO NOTHING`,
      [req.user!.id, token.slice(-20)]
    );

    logAction('user.crusher_selected', {
      userId: req.user!.id, email: req.user!.email,
      crusher: (access as any).name, role: (access as any).role,
    });

    const { role: _r, id: _i, ...crusher } = access as any;
    res.json({ token, user: { id: req.user!.id, name: req.user!.name, email: req.user!.email, role: (access as any).role }, crusher });
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
