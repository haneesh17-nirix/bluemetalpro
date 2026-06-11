import { Router } from 'express';
import { query, queryOne } from '../config/db';
import { authenticate } from '../middleware/auth';
import { requireCrusher } from '../middleware/auth';
import { generateInvoicePDF } from '../services/pdfGenerator';
import { uploadToBlob } from '../services/azureStorage';
import { logger, logAction } from '../utils/logger';

export const invoicesRouter = Router();
invoicesRouter.use(authenticate);
invoicesRouter.use(requireCrusher);

// Generate & download invoice PDF
invoicesRouter.get('/:sale_id/pdf', async (req, res) => {
  logger.info({ saleId: req.params.sale_id, crusherId: req.user!.crusher_id, user: req.user!.email }, 'Invoice PDF download requested');
  try {
    const sale = await queryOne('SELECT * FROM sales WHERE id = $1 AND crusher_id = $2', [req.params.sale_id, req.user!.crusher_id]);
    if (!sale) return res.status(404).json({ error: 'Sale not found' });

    const items = await query('SELECT * FROM sale_items WHERE sale_id = $1 ORDER BY sort_order', [req.params.sale_id]);
    const crusher = sale.crusher_id ? await queryOne('SELECT * FROM crushers WHERE id = $1', [sale.crusher_id]) : null;
    const config = await queryOne('SELECT * FROM company_config LIMIT 1');

    const pdfBuffer = await generateInvoicePDF({ sale, items, company: crusher || config });

    logAction('invoice.pdf_downloaded', { saleId: req.params.sale_id, by: req.user!.email });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${sale.invoice_number}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    logger.error({ err, saleId: req.params.sale_id, crusherId: req.user!.crusher_id, user: req.user!.email }, 'Failed to generate invoice PDF');
    return res.status(500).json({ error: 'Failed to generate invoice PDF' });
  }
});

// Upload invoice to Azure Blob & return URL
invoicesRouter.post('/:sale_id/upload', async (req, res) => {
  logger.info({ saleId: req.params.sale_id, crusherId: req.user!.crusher_id, user: req.user!.email }, 'Invoice PDF upload requested');
  try {
    const sale = await queryOne('SELECT * FROM sales WHERE id = $1 AND crusher_id = $2', [req.params.sale_id, req.user!.crusher_id]);
    if (!sale) return res.status(404).json({ error: 'Sale not found' });

    const items = await query('SELECT * FROM sale_items WHERE sale_id = $1 ORDER BY sort_order', [req.params.sale_id]);
    const crusher = sale.crusher_id ? await queryOne('SELECT * FROM crushers WHERE id = $1', [sale.crusher_id]) : null;
    const config = await queryOne('SELECT * FROM company_config LIMIT 1');

    const pdfBuffer = await generateInvoicePDF({ sale, items, company: crusher || config });
    const url = await uploadToBlob(`invoices/${sale.invoice_number}.pdf`, pdfBuffer, 'application/pdf');

    logAction('invoice.pdf_uploaded', { saleId: req.params.sale_id, url, by: req.user!.email, crusherId: req.user!.crusher_id });
    res.json({ url });
  } catch (err) {
    logger.error({ err, saleId: req.params.sale_id, crusherId: req.user!.crusher_id, user: req.user!.email }, 'Failed to upload invoice to blob storage');
    return res.status(500).json({ error: 'Failed to upload invoice' });
  }
});
