import { Router } from 'express';
import { queryOne } from '../config/db';
import { authenticate, authorize, requireCrusher } from '../middleware/auth';
import { logAction, logger } from '../utils/logger';

export const configRouter = Router();
configRouter.use(authenticate);
configRouter.use(requireCrusher);

configRouter.get('/', async (req, res) => {
  const crusherId = req.user!.crusher_id;
  logger.info({ crusherId }, 'Fetching crusher config');
  try {
    const config = await queryOne('SELECT * FROM crushers WHERE id = $1', [crusherId]);
    res.json(config || {});
  } catch (err) {
    logger.error({ err, crusherId }, 'Failed to fetch crusher config');
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

configRouter.put('/', authorize('admin'), async (req, res) => {
  const crusherId = req.user!.crusher_id;
  const byEmail = req.user!.email;
  try {
    const {
      name, legal_name, gstin, pan, address, city, state, state_code, pincode, phone, email,
      bank_name, bank_account, bank_ifsc, bank_branch, invoice_prefix,
      quarry_invoice_prefix, terms_conditions
    } = req.body;
    const config = await queryOne(
      `UPDATE crushers SET name=$1, legal_name=$2, gstin=$3, pan=$4, address=$5, city=$6, state=$7,
         state_code=$8, pincode=$9, phone=$10, email=$11, bank_name=$12, bank_account=$13,
         bank_ifsc=$14, bank_branch=$15, invoice_prefix=$16, quarry_invoice_prefix=$17,
         terms_conditions=$18, updated_at=now()
       WHERE id=$19 RETURNING *`,
      [name, legal_name, gstin, pan, address, city, state, state_code, pincode, phone, email,
       bank_name, bank_account, bank_ifsc, bank_branch, invoice_prefix,
       quarry_invoice_prefix, terms_conditions, crusherId]
    );
    logAction('config.updated', { crusherId, by: byEmail });
    res.json(config);
  } catch (err) {
    logger.error({ err, crusherId, by: byEmail }, 'Failed to update crusher config');
    res.status(500).json({ error: 'Failed to update config' });
  }
});
