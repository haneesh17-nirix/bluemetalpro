import { Router } from 'express';
import { query, queryOne } from '../config/db';
import { authenticate, authorize, requireCrusher } from '../middleware/auth';
import { logger, logAction } from '../utils/logger';

export const ledgerRouter = Router();
ledgerRouter.use(authenticate);
ledgerRouter.use(requireCrusher);

ledgerRouter.post('/receipt', authorize('admin', 'operations'), async (req, res) => {
  const cid = req.user!.crusher_id!;
  const { party_id, txn_date, amount, payment_mode, cheque_number, cheque_date, bank_name, reference_id, narration } = req.body;
  const txn = await queryOne(
    `INSERT INTO ledger_transactions (txn_type, txn_date, party_id, amount, payment_mode, cheque_number, cheque_date, bank_name, reference_id, reference_type, narration, created_by, crusher_id)
     VALUES ('receipt',$1,$2,$3,$4,$5,$6,$7,$8,'sale',$9,$10,$11) RETURNING *`,
    [txn_date, party_id, amount, payment_mode, cheque_number, cheque_date, bank_name, reference_id, narration, req.user!.id, cid]
  );
  // Update balance_due on sale if reference provided
  if (reference_id) {
    await query('UPDATE sales SET amount_received = amount_received + $1, balance_due = balance_due - $1 WHERE id = $2', [amount, reference_id]);
  }
  logAction('ledger.receipt_recorded', { party_id, amount, payment_mode, reference_id, by: req.user!.email });
  res.status(201).json(txn);
});

ledgerRouter.get('/party/:party_id', async (req, res) => {
  const cid = req.user!.crusher_id!;
  const { from, to } = req.query;
  const rows = await query(
    `SELECT * FROM ledger_transactions WHERE party_id = $1 AND txn_date BETWEEN $2 AND $3 AND crusher_id = $4 ORDER BY txn_date`,
    [req.params.party_id, from || 'now()-interval 90 days', to || 'now()', cid]
  );
  res.json(rows);
});

ledgerRouter.get('/balances', authorize('admin', 'report_viewer', 'operations'), async (req, res) => {
  const cid = req.user!.crusher_id!;
  const rows = await query('SELECT * FROM party_balances WHERE crusher_id = $1 ORDER BY total_balance DESC', [cid]);
  res.json(rows);
});
