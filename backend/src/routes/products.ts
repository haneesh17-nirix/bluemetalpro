import { Router } from 'express';
import { query, queryOne } from '../config/db';
import { authenticate, authorize, requireCrusher } from '../middleware/auth';
import { logger, logAction } from '../utils/logger';

export const productsRouter = Router();
productsRouter.use(authenticate);
productsRouter.use(requireCrusher);

productsRouter.get('/', async (req, res) => {
  const cid = req.user!.crusher_id!;
  try {
    const rows = await query(`SELECT * FROM products WHERE is_active = true AND crusher_id = $1 ORDER BY category, name`, [cid]);
    res.json(rows);
  } catch (err) {
    logger.error({ err, crusher_id: cid }, 'Failed to fetch products');
    return res.status(500).json({ error: 'Failed to fetch products' });
  }
});

productsRouter.post('/', authorize('admin'), async (req, res) => {
  const cid = req.user!.crusher_id!;
  const { name, code, category, unit, hsn_code, gst_rate, default_sale_price, default_purchase_price, description } = req.body;
  logger.info({ crusher_id: cid, name, code, category, by: req.user!.email }, 'Creating product');
  try {
    const p = await queryOne(
      `INSERT INTO products (name, code, category, unit, hsn_code, gst_rate, default_sale_price, default_purchase_price, description, crusher_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [name, code, category, unit, hsn_code, gst_rate || 5, default_sale_price, default_purchase_price, description, cid]
    );
    logAction('product.created', { name: req.body.name, category: req.body.category, by: req.user!.email, crusher_id: cid });
    res.status(201).json(p);
  } catch (err) {
    logger.error({ err, crusher_id: cid, name, code, by: req.user!.email }, 'Failed to create product');
    return res.status(500).json({ error: 'Failed to create product' });
  }
});

productsRouter.put('/:id', authorize('admin'), async (req, res) => {
  const cid = req.user!.crusher_id!;
  const { name, code, unit, hsn_code, gst_rate, default_sale_price, default_purchase_price } = req.body;
  logger.info({ crusher_id: cid, productId: req.params.id, by: req.user!.email }, 'Updating product');
  try {
    const p = await queryOne(
      `UPDATE products SET name=$1, code=$2, unit=$3, hsn_code=$4, gst_rate=$5, default_sale_price=$6, default_purchase_price=$7, updated_at=now()
       WHERE id=$8 AND crusher_id=$9 RETURNING *`,
      [name, code, unit, hsn_code, gst_rate, default_sale_price, default_purchase_price, req.params.id, cid]
    );
    if (!p) {
      logger.warn({ crusher_id: cid, productId: req.params.id }, 'Product not found for update');
      return res.status(404).json({ error: 'Product not found' });
    }
    logAction('product.updated', { productId: req.params.id, by: req.user!.email, crusher_id: cid });
    res.json(p);
  } catch (err) {
    logger.error({ err, crusher_id: cid, productId: req.params.id, by: req.user!.email }, 'Failed to update product');
    return res.status(500).json({ error: 'Failed to update product' });
  }
});
