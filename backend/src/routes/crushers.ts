import { Router } from 'express';
import { query, queryOne } from '../config/db';
import { authenticate, authorize } from '../middleware/auth';
import { logAction } from '../utils/logger';

export const crushersRouter = Router();
crushersRouter.use(authenticate);

// List all crushers (admin sees all; regular users see their accessible ones)
crushersRouter.get('/', async (req, res) => {
  if (req.user!.role === 'admin') {
    const rows = await query('SELECT * FROM crushers WHERE tenant_id = $1 ORDER BY name', [req.user!.tenant_id]);
    return res.json(rows);
  }
  const rows = await query(
    `SELECT c.*, uca.role as access_role
     FROM user_crusher_access uca JOIN crushers c ON c.id = uca.crusher_id
     WHERE uca.user_id = $1 AND uca.is_active = true AND c.is_active = true ORDER BY c.name`,
    [req.user!.id]
  );
  res.json(rows);
});

// Create crusher (admin only)
crushersRouter.post('/', authorize('admin'), async (req, res) => {
  const { name, legal_name, gstin, pan, address, city, state, state_code, pincode, phone, email,
          bank_name, bank_account, bank_ifsc, bank_branch, invoice_prefix, quarry_invoice_prefix, terms_conditions } = req.body;
  const crusher = await queryOne(
    `INSERT INTO crushers (name, legal_name, gstin, pan, address, city, state, state_code, pincode, phone, email,
       bank_name, bank_account, bank_ifsc, bank_branch, invoice_prefix, quarry_invoice_prefix, terms_conditions)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
    [name, legal_name, gstin, pan, address, city, state, state_code, pincode, phone, email,
     bank_name, bank_account, bank_ifsc, bank_branch, invoice_prefix || 'INV', quarry_invoice_prefix || 'QRY', terms_conditions]
  );
  // Grant creating admin access to this crusher
  await query(
    'INSERT INTO user_crusher_access (user_id, crusher_id, role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
    [req.user!.id, (crusher as any).id, 'admin']
  );
  logAction('crusher.created', { name, by: req.user!.email });
  res.status(201).json(crusher);
});

// Update crusher
crushersRouter.put('/:id', authorize('admin'), async (req, res) => {
  const { name, legal_name, gstin, pan, address, city, state, state_code, pincode, phone, email,
          bank_name, bank_account, bank_ifsc, bank_branch, invoice_prefix, quarry_invoice_prefix, terms_conditions, is_active } = req.body;
  const crusher = await queryOne(
    `UPDATE crushers SET name=$1, legal_name=$2, gstin=$3, pan=$4, address=$5, city=$6, state=$7, state_code=$8,
       pincode=$9, phone=$10, email=$11, bank_name=$12, bank_account=$13, bank_ifsc=$14, bank_branch=$15,
       invoice_prefix=$16, quarry_invoice_prefix=$17, terms_conditions=$18, is_active=$19, updated_at=now()
     WHERE id=$20 AND EXISTS (SELECT 1 FROM user_crusher_access WHERE crusher_id=$20 AND user_id=$21 AND is_active=true) RETURNING *`,
    [name, legal_name, gstin, pan, address, city, state, state_code, pincode, phone, email,
     bank_name, bank_account, bank_ifsc, bank_branch, invoice_prefix, quarry_invoice_prefix,
     terms_conditions, is_active, req.params.id, req.user!.id]
  );
  if (!crusher) return res.status(403).json({ error: 'Forbidden' });
  logAction('crusher.updated', { crusherId: req.params.id, by: req.user!.email });
  res.json(crusher);
});

// List users with access to a crusher
crushersRouter.get('/:id/users', authorize('admin'), async (req, res) => {
  const rows = await query(
    `SELECT u.id, u.name, u.email, u.phone, u.is_active, uca.role, uca.is_active as access_active
     FROM user_crusher_access uca JOIN users u ON u.id = uca.user_id
     WHERE uca.crusher_id = $1 ORDER BY u.name`,
    [req.params.id]
  );
  res.json(rows);
});

// Grant user access to crusher
crushersRouter.post('/:id/users', authorize('admin'), async (req, res) => {
  const { user_id, role } = req.body;
  const access = await queryOne(
    `INSERT INTO user_crusher_access (user_id, crusher_id, role)
     VALUES ($1,$2,$3)
     ON CONFLICT (user_id, crusher_id) DO UPDATE SET role=$3, is_active=true
     RETURNING *`,
    [user_id, req.params.id, role || 'report_viewer']
  );
  logAction('crusher.user_access_granted', { crusherId: req.params.id, userId: user_id, role, by: req.user!.email });
  res.status(201).json(access);
});

// Revoke user access
crushersRouter.delete('/:id/users/:user_id', authorize('admin'), async (req, res) => {
  await query(
    'UPDATE user_crusher_access SET is_active=false WHERE crusher_id=$1 AND user_id=$2',
    [req.params.id, req.params.user_id]
  );
  logAction('crusher.user_access_revoked', { crusherId: req.params.id, userId: req.params.user_id, by: req.user!.email });
  res.json({ ok: true });
});
