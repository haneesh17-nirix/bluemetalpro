import { Router } from 'express';
import { query, queryOne } from '../config/db';
import { authenticate, authorize, requireCrusher } from '../middleware/auth';
import { logger, logAction } from '../utils/logger';
import { fanOut } from '../services/notifyService';

export const ledgerRouter = Router();
ledgerRouter.use(authenticate);
ledgerRouter.use(requireCrusher);

ledgerRouter.post('/receipt', authorize('admin', 'operations'), async (req, res) => {
  const cid = req.user!.crusher_id!;
  const { party_id, txn_date, amount, payment_mode, cheque_number, cheque_date, bank_name, sale_id, narration } = req.body;
  try {
    const txn = await queryOne(
      `INSERT INTO ledger_transactions (txn_type, txn_date, party_id, amount, payment_mode, cheque_number, cheque_date, bank_name, sale_id, narration, created_by, crusher_id)
       VALUES ('receipt',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [txn_date, party_id, amount, payment_mode, cheque_number, cheque_date, bank_name, sale_id || null, narration, req.user!.id, cid]
    );
    if (sale_id) {
      await query('UPDATE sales SET amount_received = amount_received + $1, balance_due = balance_due - $1 WHERE id = $2 AND crusher_id = $3', [amount, sale_id, cid]);
    }
    const partyRow = party_id ? await queryOne('SELECT name FROM parties WHERE id = $1', [party_id]) : null;
    fanOut(cid, {
      type: 'ledger',
      title: 'Payment Received',
      body: `₹${Number(amount).toLocaleString('en-IN')} received${partyRow ? ` from ${(partyRow as any).name}` : ''} via ${payment_mode}`,
      reference_id: (txn as any).id,
    }).catch((err: unknown) => logger.warn({ err, crusher_id: cid }, 'fanOut failed for ledger receipt'));
    logAction('ledger.receipt_recorded', { party_id, amount, payment_mode, sale_id, by: req.user!.email, crusher_id: cid });
    res.status(201).json(txn);
  } catch (err) {
    logger.error({ err, crusher_id: cid, party_id, amount, sale_id, by: req.user!.email }, 'Failed to record ledger receipt');
    return res.status(500).json({ error: 'Failed to record receipt' });
  }
});

ledgerRouter.get('/party/:party_id', async (req, res) => {
  const cid = req.user!.crusher_id!;
  const { from, to } = req.query;
  const fromDate = (from as string) || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const toDate = (to as string) || new Date().toISOString().slice(0, 10);
  const limit = Math.min(parseInt((req.query.limit as string) || '100', 10), 500);
  const offset = parseInt((req.query.offset as string) || '0', 10);
  logger.info({ crusher_id: cid, party_id: req.params.party_id, from: fromDate, to: toDate, limit, offset }, 'ledger.party_ledger_query');
  try {
    const rows = await query(
      'SELECT * FROM ledger_transactions WHERE party_id = $1 AND txn_date BETWEEN $2 AND $3 AND crusher_id = $4 ORDER BY txn_date LIMIT $5 OFFSET $6',
      [req.params.party_id, fromDate, toDate, cid, limit, offset]
    );
    res.json(rows);
  } catch (err) {
    logger.error({ err, crusher_id: cid, party_id: req.params.party_id, from: fromDate, to: toDate, by: req.user!.email }, 'Failed to fetch ledger for party');
    return res.status(500).json({ error: 'Failed to fetch ledger' });
  }
});

ledgerRouter.get('/balances', authorize('admin', 'report_viewer', 'operations'), async (req, res) => {
  const cid = req.user!.crusher_id!;
  try {
    const rows = await query('SELECT * FROM party_balances WHERE crusher_id = $1 ORDER BY total_balance DESC', [cid]);
    res.json(rows);
  } catch (err) {
    logger.error({ err, crusher_id: cid, by: req.user!.email }, 'Failed to fetch party balances');
    return res.status(500).json({ error: 'Failed to fetch balances' });
  }
});
