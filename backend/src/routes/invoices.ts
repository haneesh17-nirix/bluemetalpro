import { Router } from 'express';
import { query, queryOne } from '../config/db';
import { authenticate } from '../middleware/auth';
import { generateInvoicePDF } from '../services/pdfGenerator';
import { uploadToBlob } from '../services/azureStorage';

export const invoicesRouter = Router();
invoicesRouter.use(authenticate);

// Generate & download invoice PDF
invoicesRouter.get('/:sale_id/pdf', async (req, res) => {
  const sale = await queryOne('SELECT * FROM sales WHERE id = $1', [req.params.sale_id]);
  if (!sale) return res.status(404).json({ error: 'Sale not found' });

  const items = await query('SELECT * FROM sale_items WHERE sale_id = $1 ORDER BY sort_order', [req.params.sale_id]);
  const config = await queryOne('SELECT * FROM company_config LIMIT 1');

  const pdfBuffer = await generateInvoicePDF({ sale, items, company: config });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${sale.invoice_number}.pdf"`);
  res.send(pdfBuffer);
});

// Upload invoice to Azure Blob & return URL
invoicesRouter.post('/:sale_id/upload', async (req, res) => {
  const sale = await queryOne('SELECT * FROM sales WHERE id = $1', [req.params.sale_id]);
  if (!sale) return res.status(404).json({ error: 'Sale not found' });

  const items = await query('SELECT * FROM sale_items WHERE sale_id = $1 ORDER BY sort_order', [req.params.sale_id]);
  const config = await queryOne('SELECT * FROM company_config LIMIT 1');

  const pdfBuffer = await generateInvoicePDF({ sale, items, company: config });
  const url = await uploadToBlob(`invoices/${sale.invoice_number}.pdf`, pdfBuffer, 'application/pdf');

  res.json({ url });
});
