import PDFDocument from 'pdfkit';

interface InvoiceData {
  sale: any;
  items: any[];
  company: any;
}

export async function generateInvoicePDF({ sale, items, company }: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const buffers: Buffer[] = [];
    doc.on('data', (b) => buffers.push(b));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const W = 515;
    const primaryColor = '#1a3c5e';

    // Header background
    doc.rect(40, 40, W, 80).fill(primaryColor);

    // Company name
    doc.fillColor('white').fontSize(18).font('Helvetica-Bold')
      .text(company?.company_name || 'Stone Crusher', 50, 55);
    doc.fontSize(9).font('Helvetica')
      .text(company?.address || '', 50, 78)
      .text(`GSTIN: ${company?.gstin || ''}  |  Ph: ${company?.phone || ''}`, 50, 90);

    // Invoice type badge
    doc.fillColor('#FFD700').fontSize(11).font('Helvetica-Bold')
      .text(sale.invoice_type === 'tax_invoice' ? 'TAX INVOICE' : 'DELIVERY CHALLAN', 380, 55);

    // Invoice details box
    doc.rect(40, 130, W, 60).stroke(primaryColor);
    doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold')
      .text('Invoice No:', 50, 140)
      .text('Date:', 50, 153)
      .text('Vehicle No:', 50, 166);
    doc.fillColor('#333').font('Helvetica')
      .text(sale.invoice_number, 120, 140)
      .text(new Date(sale.sale_date).toLocaleDateString('en-IN'), 120, 153)
      .text(sale.vehicle_number || '-', 120, 166);

    // Bill to
    doc.fillColor(primaryColor).font('Helvetica-Bold').text('Bill To:', 300, 140);
    doc.fillColor('#333').font('Helvetica').fontSize(9)
      .text(sale.party_name || 'CASH', 300, 153)
      .text(sale.party_address || '', 300, 164, { width: 240 });
    if (sale.party_gstin) {
      doc.text(`GSTIN: ${sale.party_gstin}`, 300, 183);
    }

    // Table header
    let y = 205;
    doc.rect(40, y, W, 18).fill(primaryColor);
    doc.fillColor('white').fontSize(8).font('Helvetica-Bold');
    const cols = { sno: 42, desc: 60, hsn: 200, unit: 255, qty: 295, rate: 340, amount: 395, tax: 440, total: 490 };
    doc.text('#', cols.sno, y + 5)
       .text('Description', cols.desc, y + 5)
       .text('HSN', cols.hsn, y + 5)
       .text('Unit', cols.unit, y + 5)
       .text('Qty', cols.qty, y + 5)
       .text('Rate', cols.rate, y + 5)
       .text('Amount', cols.amount, y + 5)
       .text('GST', cols.tax, y + 5)
       .text('Total', cols.total, y + 5);

    y += 20;
    doc.fillColor('#333').font('Helvetica').fontSize(8);
    items.forEach((item, idx) => {
      if (y > 700) { doc.addPage(); y = 60; }
      if (idx % 2 === 0) doc.rect(40, y - 3, W, 16).fill('#f5f5f5');
      doc.fillColor('#333')
        .text(String(idx + 1), cols.sno, y)
        .text(item.product_name, cols.desc, y, { width: 130 })
        .text(item.hsn_code || '', cols.hsn, y)
        .text(item.unit || '', cols.unit, y)
        .text(Number(item.quantity).toFixed(3), cols.qty, y)
        .text(Number(item.rate).toFixed(2), cols.rate, y)
        .text(Number(item.amount).toFixed(2), cols.amount, y)
        .text(`${item.gst_rate}%`, cols.tax, y)
        .text(Number(item.total_amount).toFixed(2), cols.total, y);
      y += 18;
    });

    // Totals
    y += 5;
    doc.moveTo(40, y).lineTo(555, y).stroke(primaryColor);
    y += 10;
    const totalsX = 380;
    const addRow = (label: string, value: string, bold = false) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9)
        .fillColor(bold ? primaryColor : '#333')
        .text(label, totalsX, y)
        .text(value, totalsX + 100, y, { align: 'right', width: 70 });
      y += 14;
    };
    addRow('Subtotal:', `₹${Number(sale.subtotal).toFixed(2)}`);
    if (Number(sale.discount_amount) > 0) addRow('Discount:', `-₹${Number(sale.discount_amount).toFixed(2)}`);
    addRow('Taxable Amount:', `₹${Number(sale.taxable_amount).toFixed(2)}`);
    if (Number(sale.cgst_amount) > 0) addRow('CGST:', `₹${Number(sale.cgst_amount).toFixed(2)}`);
    if (Number(sale.sgst_amount) > 0) addRow('SGST:', `₹${Number(sale.sgst_amount).toFixed(2)}`);
    if (Number(sale.igst_amount) > 0) addRow('IGST:', `₹${Number(sale.igst_amount).toFixed(2)}`);
    addRow('GRAND TOTAL:', `₹${Number(sale.grand_total).toFixed(2)}`, true);
    if (Number(sale.amount_received) > 0) addRow('Amount Received:', `₹${Number(sale.amount_received).toFixed(2)}`);
    addRow('Balance Due:', `₹${Number(sale.balance_due).toFixed(2)}`, Number(sale.balance_due) > 0);

    // Bank details
    if (company?.bank_name) {
      y += 15;
      doc.rect(40, y, 250, 55).stroke(primaryColor);
      doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(8).text('Bank Details:', 50, y + 7);
      doc.fillColor('#333').font('Helvetica')
        .text(`Bank: ${company.bank_name}`, 50, y + 18)
        .text(`A/C: ${company.bank_account}`, 50, y + 29)
        .text(`IFSC: ${company.bank_ifsc}`, 50, y + 40);
    }

    // Signature
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(8)
      .text('Authorised Signatory', 430, y + 30)
      .text(company?.company_name || '', 430, y + 43);

    // Footer
    doc.fillColor('#888').fontSize(7).font('Helvetica')
      .text('This is a computer generated invoice.', 40, 795, { align: 'center', width: W });
    if (company?.terms_conditions) {
      doc.text(company.terms_conditions, 40, 805, { align: 'center', width: W });
    }

    doc.end();
  });
}
