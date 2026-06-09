import { Router } from 'express';
import { queryOne } from '../config/db';
import { authenticate, authorize } from '../middleware/auth';

export const configRouter = Router();
configRouter.use(authenticate);

configRouter.get('/', async (req, res) => {
  const config = await queryOne('SELECT * FROM company_config LIMIT 1');
  res.json(config || {});
});

configRouter.put('/', authorize('admin'), async (req, res) => {
  const {
    company_name, gstin, pan, address, city, state, pincode, phone, email,
    bank_name, bank_account, bank_ifsc, bank_branch, invoice_prefix,
    quarry_invoice_prefix, terms_conditions
  } = req.body;
  const existing = await queryOne('SELECT id FROM company_config LIMIT 1');
  let config;
  if (existing) {
    config = await queryOne(
      `UPDATE company_config SET company_name=$1, gstin=$2, pan=$3, address=$4, city=$5, state=$6, pincode=$7,
       phone=$8, email=$9, bank_name=$10, bank_account=$11, bank_ifsc=$12, bank_branch=$13,
       invoice_prefix=$14, quarry_invoice_prefix=$15, terms_conditions=$16, updated_at=now()
       WHERE id=$17 RETURNING *`,
      [company_name, gstin, pan, address, city, state, pincode, phone, email,
       bank_name, bank_account, bank_ifsc, bank_branch, invoice_prefix,
       quarry_invoice_prefix, terms_conditions, existing.id]
    );
  } else {
    config = await queryOne(
      `INSERT INTO company_config (company_name, gstin, pan, address, city, state, pincode, phone, email,
        bank_name, bank_account, bank_ifsc, bank_branch, invoice_prefix, quarry_invoice_prefix, terms_conditions)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [company_name, gstin, pan, address, city, state, pincode, phone, email,
       bank_name, bank_account, bank_ifsc, bank_branch, invoice_prefix || 'INV',
       quarry_invoice_prefix || 'QRY', terms_conditions]
    );
  }
  res.json(config);
});
