import { Router } from 'express';
import { query, queryOne } from '../config/db';
import { authenticate, authorize } from '../middleware/auth';

export const productsRouter = Router();
productsRouter.use(authenticate);

productsRouter.get('/', async (req, res) => {
  const rows = await query(`SELECT * FROM products WHERE is_active = true ORDER BY category, name`);
  res.json(rows);
});

productsRouter.post('/', authorize('admin'), async (req, res) => {
  const { name, code, category, unit, hsn_code, gst_rate, default_sale_price, default_purchase_price, description } = req.body;
  const p = await queryOne(
    `INSERT INTO products (name, code, category, unit, hsn_code, gst_rate, default_sale_price, default_purchase_price, description)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [name, code, category, unit, hsn_code, gst_rate || 5, default_sale_price, default_purchase_price, description]
  );
  res.status(201).json(p);
});

productsRouter.put('/:id', authorize('admin'), async (req, res) => {
  const { name, code, unit, hsn_code, gst_rate, default_sale_price, default_purchase_price } = req.body;
  const p = await queryOne(
    `UPDATE products SET name=$1, code=$2, unit=$3, hsn_code=$4, gst_rate=$5, default_sale_price=$6, default_purchase_price=$7, updated_at=now()
     WHERE id=$8 RETURNING *`,
    [name, code, unit, hsn_code, gst_rate, default_sale_price, default_purchase_price, req.params.id]
  );
  res.json(p);
});
