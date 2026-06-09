import { Router } from 'express';
import { query, queryOne } from '../config/db';
import { authenticate, authorize, requireCrusher } from '../middleware/auth';
import { logger, logAction } from '../utils/logger';

export const wagesRouter = Router();
wagesRouter.use(authenticate);
wagesRouter.use(requireCrusher);

wagesRouter.get('/workers', async (req, res) => {
  const cid = req.user!.crusher_id!;
  const rows = await query(`SELECT * FROM workers WHERE is_active = true AND crusher_id = $1 ORDER BY name`, [cid]);
  res.json(rows);
});

wagesRouter.post('/workers', authorize('admin', 'accounts'), async (req, res) => {
  const cid = req.user!.crusher_id!;
  const { name, phone, designation, wage_type, wage_rate, joining_date, aadhaar } = req.body;
  const w = await queryOne(
    `INSERT INTO workers (name, phone, designation, wage_type, wage_rate, joining_date, aadhaar, crusher_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [name, phone, designation, wage_type || 'daily', wage_rate, joining_date, aadhaar, cid]
  );
  logAction('worker.created', { name: req.body.name, designation: req.body.designation, wage_type: req.body.wage_type || 'daily', by: req.user!.email });
  res.status(201).json(w);
});

wagesRouter.put('/workers/:id', authorize('admin', 'accounts'), async (req, res) => {
  const cid = req.user!.crusher_id!;
  const { name, phone, designation, wage_type, wage_rate } = req.body;
  const w = await queryOne(
    `UPDATE workers SET name=$1, phone=$2, designation=$3, wage_type=$4, wage_rate=$5, updated_at=now()
     WHERE id=$6 AND crusher_id=$7 RETURNING *`,
    [name, phone, designation, wage_type, wage_rate, req.params.id, cid]
  );
  logAction('worker.updated', { workerId: req.params.id, by: req.user!.email });
  res.json(w);
});

// Bulk attendance entry
wagesRouter.post('/attendance/bulk', authorize('admin', 'accounts'), async (req, res) => {
  const cid = req.user!.crusher_id!;
  const { date, entries } = req.body;
  // entries: [{worker_id, status, overtime_hours, advance}]
  const results = await Promise.all(entries.map((e: any) =>
    queryOne(
      `INSERT INTO attendance (worker_id, date, status, overtime_hours, advance, created_by, crusher_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (worker_id, date) DO UPDATE SET status=$3, overtime_hours=$4, advance=$5
       RETURNING *`,
      [e.worker_id, date, e.status, e.overtime_hours || 0, e.advance || 0, req.user!.id, cid]
    )
  ));
  logAction('attendance.bulk_entry', { date: req.body.date, count: (req.body.entries || []).length, by: req.user!.email });
  res.json(results);
});

wagesRouter.get('/attendance', async (req, res) => {
  const cid = req.user!.crusher_id!;
  const { date, from, to, worker_id } = req.query;
  let where = 'WHERE 1=1';
  const params: any[] = [];
  if (date) { params.push(date); where += ` AND a.date = $${params.length}`; }
  if (from && to) { params.push(from, to); where += ` AND a.date BETWEEN $${params.length-1} AND $${params.length}`; }
  if (worker_id) { params.push(worker_id); where += ` AND a.worker_id = $${params.length}`; }
  const rows = await query(
    `SELECT a.*, w.name as worker_name, w.wage_type, w.wage_rate, w.designation
     FROM attendance a JOIN workers w ON w.id = a.worker_id AND w.crusher_id = $${params.length + 1} ${where} ORDER BY a.date DESC, w.name`,
    [...params, cid]
  );
  res.json(rows);
});

// Calculate wages for a period
wagesRouter.post('/calculate', authorize('admin', 'accounts'), async (req, res) => {
  const { worker_id, from, to } = req.body;
  const worker = await queryOne('SELECT * FROM workers WHERE id = $1', [worker_id]);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });

  const attendance = await query(
    `SELECT status, overtime_hours, SUM(advance) as advance
     FROM attendance WHERE worker_id = $1 AND date BETWEEN $2 AND $3 GROUP BY status, overtime_hours`,
    [worker_id, from, to]
  );
  const present = attendance.filter(a => a.status === 'present').length;
  const half = attendance.filter(a => a.status === 'half_day').length;
  const overtime = attendance.reduce((s, a) => s + Number(a.overtime_hours || 0), 0);
  const advance = attendance.reduce((s, a) => s + Number(a.advance || 0), 0);

  const days_worked = present + half * 0.5;
  const gross_wages = days_worked * Number(worker.wage_rate) + overtime * (Number(worker.wage_rate) / 8) * 1.5;

  res.json({ worker, days_worked, overtime_hours: overtime, gross_wages, advance_deducted: advance, net_wages: gross_wages - advance });
});

wagesRouter.post('/pay', authorize('admin', 'accounts'), async (req, res) => {
  const { worker_id, period_from, period_to, days_worked, gross_wages, deductions, advances_deducted, net_wages, payment_date, payment_mode, notes } = req.body;
  const p = await queryOne(
    `INSERT INTO wage_payments (worker_id, period_from, period_to, days_worked, gross_wages, deductions, advances_deducted, net_wages, payment_date, payment_mode, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [worker_id, period_from, period_to, days_worked, gross_wages, deductions || 0, advances_deducted || 0, net_wages, payment_date, payment_mode, notes, req.user!.id]
  );
  res.status(201).json(p);
});
