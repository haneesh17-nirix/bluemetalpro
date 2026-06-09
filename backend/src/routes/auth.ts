import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, queryOne } from '../config/db';
import { authenticate } from '../middleware/auth';

export const authRouter = Router();

// Login
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password, fcm_token } = req.body;
    const user = await queryOne(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase()]
    );
    if (!user || !await bcrypt.compare(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );
    // Save session & FCM token
    if (fcm_token) {
      await query(
        `INSERT INTO user_sessions (user_id, token_hash, fcm_token, expires_at)
         VALUES ($1, $2, $3, now() + interval '7 days')
         ON CONFLICT DO NOTHING`,
        [user.id, token.slice(-20), fcm_token]
      );
    }
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Me
authRouter.get('/me', authenticate, async (req, res) => {
  const user = await queryOne('SELECT id, name, email, role, phone FROM users WHERE id = $1', [req.user!.id]);
  res.json(user);
});

// Change password
authRouter.post('/change-password', authenticate, async (req, res) => {
  const { current_password, new_password } = req.body;
  const user = await queryOne('SELECT * FROM users WHERE id = $1', [req.user!.id]);
  if (!user || !await bcrypt.compare(current_password, user.password_hash)) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }
  const hash = await bcrypt.hash(new_password, 10);
  await query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [hash, req.user!.id]);
  res.json({ message: 'Password updated' });
});

// Logout
authRouter.post('/logout', authenticate, async (req, res) => {
  await query('DELETE FROM user_sessions WHERE user_id = $1', [req.user!.id]);
  res.json({ message: 'Logged out' });
});
