import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne } from '../config/db';
import { authenticate, authorize } from '../middleware/auth';

export const usersRouter = Router();
usersRouter.use(authenticate);
usersRouter.use(authorize('admin'));

usersRouter.get('/', async (req, res) => {
  const rows = await query(`SELECT id, name, email, phone, role, is_active, created_at FROM users ORDER BY name`);
  res.json(rows);
});

usersRouter.post('/', async (req, res) => {
  const { name, email, phone, role, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const user = await queryOne(
    `INSERT INTO users (name, email, phone, role, password_hash, created_by)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, name, email, phone, role, is_active`,
    [name, email.toLowerCase(), phone, role, hash, req.user!.id]
  );
  res.status(201).json(user);
});

usersRouter.put('/:id', async (req, res) => {
  const { name, phone, role, is_active } = req.body;
  const user = await queryOne(
    `UPDATE users SET name=$1, phone=$2, role=$3, is_active=$4, updated_at=now()
     WHERE id=$5 RETURNING id, name, email, phone, role, is_active`,
    [name, phone, role, is_active, req.params.id]
  );
  res.json(user);
});

usersRouter.post('/:id/reset-password', async (req, res) => {
  const { password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  await query('UPDATE users SET password_hash=$1, updated_at=now() WHERE id=$2', [hash, req.params.id]);
  res.json({ message: 'Password reset' });
});
