import { Router } from 'express';
import { query, queryOne, pool } from '../config/db';
import { authenticate, authorize, requireCrusher } from '../middleware/auth';
import { fanOut } from '../services/notifyService';
import { logger, logAction } from '../utils/logger';

export const wagesRouter = Router();
wagesRouter.use(authenticate);
wagesRouter.use(requireCrusher);

wagesRouter.get('/workers', authorize('admin', 'operations', 'report_viewer'), async (req, res) => {
  const cid = req.user!.crusher_id!;
  try {
    const rows = await query(`SELECT * FROM workers WHERE is_active = true AND crusher_id = $1 ORDER BY name`, [cid]);
    res.json(rows);
  } catch (err) {
    logger.error({ err, crusher_id: cid }, 'Failed to fetch workers');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

wagesRouter.post('/workers', authorize('admin', 'operations'), async (req, res) => {
  const cid = req.user!.crusher_id!;
  const { name, phone, designation, wage_type, wage_rate, joining_date, aadhaar } = req.body;
  try {
    const w = await queryOne(
      `INSERT INTO workers (name, phone, designation, wage_type, wage_rate, joining_date, aadhaar, crusher_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [name, phone, designation, wage_type || 'daily', wage_rate, joining_date, aadhaar, cid]
    );
    logAction('worker.created', { workerId: w!.id, name, designation, wage_type: wage_type || 'daily', crusher_id: cid, by: req.user!.email });
    res.status(201).json(w);
  } catch (err) {
    logger.error({ err, crusher_id: cid, body: req.body }, 'Failed to create worker');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

wagesRouter.put('/workers/:id', authorize('admin', 'operations'), async (req, res) => {
  const cid = req.user!.crusher_id!;
  const { name, phone, designation, wage_type, wage_rate } = req.body;
  try {
    const w = await queryOne(
      `UPDATE workers SET name=$1, phone=$2, designation=$3, wage_type=$4, wage_rate=$5, updated_at=now()
       WHERE id=$6 AND crusher_id=$7 RETURNING *`,
      [name, phone, designation, wage_type, wage_rate, req.params.id, cid]
    );
    logAction('worker.updated', { workerId: req.params.id, changes: { name, phone, designation, wage_type, wage_rate }, by: req.user!.email, crusher_id: cid });
    res.json(w);
  } catch (err) {
    logger.error({ err, workerId: req.params.id, crusher_id: cid }, 'Failed to update worker');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk attendance entry
wagesRouter.post('/attendance/bulk', authorize('admin', 'operations'), async (req, res) => {
  const cid = req.user!.crusher_id!;
  const { date, entries } = req.body;
  // entries: [{worker_id, status, overtime_hours, advance}]
  const workerIds = entries.map((e: any) => e.worker_id);
  const statuses = entries.map((e: any) => e.status);
  const overtimeHours = entries.map((e: any) => e.overtime_hours || 0);
  const advances = entries.map((e: any) => e.advance || 0);
  logger.info({ crusher_id: cid, date, entryCount: entries.length, by: req.user!.email }, 'Bulk attendance entry started');
  const client = await pool.connect();
  let results: any[];
  try {
    await client.query('BEGIN');
    const res = await client.query(
      `INSERT INTO attendance (worker_id, date, status, overtime_hours, advance, created_by, crusher_id)
       SELECT unnest($1::int[]), $2, unnest($3::text[]), unnest($4::numeric[]), unnest($5::numeric[]), $6, $7
       ON CONFLICT (worker_id, date) DO UPDATE SET status=EXCLUDED.status, overtime_hours=EXCLUDED.overtime_hours, advance=EXCLUDED.advance
       RETURNING *`,
      [workerIds, date, statuses, overtimeHours, advances, req.user!.id, cid]
    );
    await client.query('COMMIT');
    results = res.rows;
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err, crusher_id: cid, date, entryCount: entries.length, by: req.user!.email }, 'Bulk attendance insert failed');
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
  logAction('attendance.bulk_entry', { date: req.body.date, count: (req.body.entries || []).length, by: req.user!.email });
  res.json(results);
});

wagesRouter.get('/attendance', authorize('admin', 'operations', 'report_viewer'), async (req, res) => {
  const cid = req.user!.crusher_id!;
  const { date, from, to, worker_id } = req.query;
  let where = 'WHERE 1=1';
  const params: any[] = [];
  if (date) { params.push(date); where += ` AND a.date = $${params.length}`; }
  if (from && to) { params.push(from, to); where += ` AND a.date BETWEEN $${params.length-1} AND $${params.length}`; }
  if (worker_id) { params.push(worker_id); where += ` AND a.worker_id = $${params.length}`; }
  try {
    const rows = await query(
      `SELECT a.*, w.name as worker_name, w.wage_type, w.wage_rate, w.designation
       FROM attendance a JOIN workers w ON w.id = a.worker_id AND w.crusher_id = $${params.length + 1} ${where} ORDER BY a.date DESC, w.name`,
      [...params, cid]
    );
    res.json(rows);
  } catch (err) {
    logger.error({ err, crusher_id: cid, query: req.query }, 'Failed to fetch attendance');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Calculate wages for a period
wagesRouter.post('/calculate', authorize('admin', 'operations'), async (req, res) => {
  const { worker_id, from, to } = req.body;
  const cid = req.user!.crusher_id!;
  logger.info({ worker_id, from, to, crusher_id: cid, by: req.user!.email }, 'Wage calculation requested');
  try {
    const worker = await queryOne('SELECT * FROM workers WHERE id = $1 AND crusher_id = $2', [worker_id, cid]);
    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    const attendance = await query(
      `SELECT status, overtime_hours, SUM(advance) as advance
       FROM attendance WHERE worker_id = $1 AND date BETWEEN $2 AND $3 AND crusher_id = $4 GROUP BY status, overtime_hours`,
      [worker_id, from, to, cid]
    );
    const present = attendance.filter(a => a.status === 'present').length;
    const half = attendance.filter(a => a.status === 'half_day').length;
    const overtime = attendance.reduce((s, a) => s + Number(a.overtime_hours || 0), 0);
    const advance = attendance.reduce((s, a) => s + Number(a.advance || 0), 0);

    const days_worked = present + half * 0.5;
    const gross_wages = days_worked * Number(worker.wage_rate) + overtime * (Number(worker.wage_rate) / 8) * 1.5;

    res.json({ worker, days_worked, overtime_hours: overtime, gross_wages, advance_deducted: advance, net_wages: gross_wages - advance });
  } catch (err) {
    logger.error({ err, worker_id, from, to, crusher_id: cid }, 'Wage calculation failed');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

wagesRouter.post('/pay', authorize('admin', 'operations'), async (req, res) => {
  const cid = req.user!.crusher_id!;
  const { worker_id, period_from, period_to, days_worked, gross_wages, deductions, advances_deducted, net_wages, payment_date, payment_mode, notes } = req.body;
  try {
    const p = await queryOne(
      `INSERT INTO wage_payments (crusher_id, worker_id, period_from, period_to, days_worked, gross_wages, deductions, advances_deducted, net_wages, payment_date, payment_mode, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [cid, worker_id, period_from, period_to, days_worked, gross_wages, deductions || 0, advances_deducted || 0, net_wages, payment_date, payment_mode, notes, req.user!.id]
    );

    logAction('wages.payment_recorded', { paymentId: p!.id, worker_id, net_wages, period_from, period_to, payment_mode, by: req.user!.email, crusher_id: cid });

    // Real-time SSE fan-out (fire-and-forget)
    const period = `${period_from} – ${period_to}`;
    fanOut(cid, {
      type: 'wages',
      title: `Wages Processed`,
      body: `₹${Number(net_wages).toLocaleString('en-IN')} · ${period}`,
    }).catch(() => {});

    res.status(201).json(p);
  } catch (err) {
    logger.error({ err, crusher_id: cid, worker_id, period_from, period_to, net_wages }, 'Failed to record wage payment');
    return res.status(500).json({ error: 'Internal server error' });
  }
});
