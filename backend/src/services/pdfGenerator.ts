import PDFDocument from 'pdfkit';

interface InvoiceData {
  sale: any;
  items: any[];
  company: any;
}

const INR = (n: number) =>
  '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export async function generateInvoicePDF({ sale, items, company }: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4' });
    const buffers: Buffer[] = [];
    doc.on('data', (b) => buffers.push(b));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const PW = 595.28;   // A4 width pts
    const ML = 36;       // margin left
    const MR = 36;       // margin right
    const CW = PW - ML - MR;  // content width

    // ── Palette ──────────────────────────────────────────────────
    const NAVY   = '#0f2444';
    const GOLD   = '#b8953e';
    const GOLD2  = '#d4aa52';
    const LIGHT  = '#f4f6f9';
    const MUTED  = '#6b7a93';
    const BLACK  = '#1a1f2e';
    const WHITE  = '#ffffff';
    const DIVIDER = '#dce3ee';

    // ── Header band ───────────────────────────────────────────────
    doc.rect(0, 0, PW, 115).fill(NAVY);
    // gold accent strip
    doc.rect(0, 113, PW, 3).fill(GOLD);

    // Company name & details (left)
    const companyName = company?.legal_name || company?.company_name || 'BlueMetal Pro';
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(16)
      .text(companyName, ML, 20, { width: 320 });

    doc.fillColor(GOLD2).font('Helvetica').fontSize(8)
      .text('QUARRY & AGGREGATE SUPPLIER', ML, 40);

    const addrParts: string[] = [];
    if (company?.address) addrParts.push(company.address);
    if (company?.city && company?.state) addrParts.push(`${company.city}, ${company.state} ${company?.pincode || ''}`);
    if (company?.phone) addrParts.push(`Tel: ${company.phone}`);
    if (company?.email) addrParts.push(company.email);
    if (company?.gstin) addrParts.push(`GSTIN: ${company.gstin}`);

    doc.fillColor('rgba(255,255,255,0.75)').font('Helvetica').fontSize(8)
      .text(addrParts.join('  |  '), ML, 52, { width: 340, lineGap: 3 });

    // Invoice type badge (right)
    const badgeLabel = sale.invoice_type === 'tax_invoice' ? 'TAX INVOICE' : 'DELIVERY CHALLAN';
    doc.rect(PW - MR - 140, 18, 140, 26).fill(GOLD);
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(10)
      .text(badgeLabel, PW - MR - 140, 26, { width: 140, align: 'center' });

    // Invoice meta box (right)
    const metaX = PW - MR - 170;
    const metaY = 52;
    doc.rect(metaX, metaY, 170, 54).fill('rgba(255,255,255,0.08)').stroke('rgba(255,255,255,0.15)');
    const metaRows = [
      ['Invoice No', sale.invoice_number],
      ['Date', fmtDate(sale.sale_date)],
      ['Vehicle', sale.vehicle_number || '—'],
    ];
    metaRows.forEach(([label, value], i) => {
      const ry = metaY + 7 + i * 16;
      doc.fillColor(GOLD2).font('Helvetica-Bold').fontSize(7).text(label + ':', metaX + 8, ry);
      doc.fillColor(WHITE).font('Helvetica').fontSize(8).text(String(value), metaX + 72, ry, { width: 90 });
    });

    // ── Bill-To + Ship-To row ─────────────────────────────────────
    let y = 126;
    doc.rect(ML, y, CW, 70).fill(LIGHT).stroke(DIVIDER);

    // Bill To
    doc.rect(ML, y, CW / 2 - 1, 70).fill(LIGHT);
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(7.5)
      .text('BILL TO', ML + 10, y + 8);
    doc.moveTo(ML + 10, y + 17).lineTo(ML + 10 + 28, y + 17).lineWidth(1).stroke(GOLD);
    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(9.5)
      .text(sale.party_name || 'CASH SALE', ML + 10, y + 22);
    if (sale.party_address) {
      doc.fillColor(MUTED).font('Helvetica').fontSize(8)
        .text(sale.party_address, ML + 10, y + 35, { width: CW / 2 - 22, lineGap: 2 });
    }
    if (sale.party_gstin) {
      doc.fillColor(MUTED).fontSize(7.5).text(`GSTIN: ${sale.party_gstin}`, ML + 10, y + 56);
    }

    // Payment info (right half)
    const rhX = ML + CW / 2 + 10;
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(7.5).text('PAYMENT', rhX, y + 8);
    doc.moveTo(rhX, y + 17).lineTo(rhX + 28, y + 17).lineWidth(1).stroke(GOLD);
    const pmodeMap: Record<string, string> = { cash: 'Cash', upi: 'UPI', cheque: 'Cheque', neft: 'NEFT/RTGS', rtgs: 'NEFT/RTGS', credit: 'Credit' };
    const pmode = pmodeMap[sale.payment_mode] || sale.payment_mode || 'Credit';
    doc.fillColor(BLACK).font('Helvetica').fontSize(8.5).text(pmode, rhX, y + 22);
    if (sale.balance_due > 0) {
      doc.fillColor('#c0392b').font('Helvetica-Bold').fontSize(8)
        .text(`Balance Due: ${INR(sale.balance_due)}`, rhX, y + 35);
    } else {
      doc.fillColor('#27ae60').font('Helvetica-Bold').fontSize(8).text('Fully Paid', rhX, y + 35);
    }

    // ── Items table header ────────────────────────────────────────
    y += 78;
    doc.rect(ML, y, CW, 20).fill(NAVY);
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(7.5);
    const C = {
      sno:    ML + 4,
      desc:   ML + 22,
      hsn:    ML + 210,
      unit:   ML + 260,
      qty:    ML + 300,
      rate:   ML + 345,
      amount: ML + 395,
      gst:    ML + 445,
      total:  ML + 483,
    };
    const TH = (txt: string, x: number, opts?: any) =>
      doc.text(txt, x, y + 6, { width: 50, ...opts });
    TH('#', C.sno, { width: 16 });
    TH('Description / Product', C.desc, { width: 180 });
    TH('HSN', C.hsn, { width: 45 });
    TH('Unit', C.unit, { width: 36 });
    TH('Qty', C.qty, { width: 40, align: 'right' });
    TH('Rate', C.rate, { width: 46, align: 'right' });
    TH('Amount', C.amount, { width: 46, align: 'right' });
    TH('GST%', C.gst, { width: 34, align: 'right' });
    TH('Total', C.total, { width: 46, align: 'right' });

    y += 22;
    doc.lineWidth(0.5);
    items.forEach((item, idx) => {
      const rowH = 18;
      if (y + rowH > 720) {
        doc.addPage({ margin: 0, size: 'A4' });
        y = 40;
      }
      if (idx % 2 === 0) doc.rect(ML, y - 2, CW, rowH).fill('#f9fafc');
      doc.fillColor(BLACK).font('Helvetica').fontSize(8);
      const RV = (txt: string, x: number, opts?: any) =>
        doc.text(txt, x, y + 2, { width: 50, ...opts });
      RV(String(idx + 1), C.sno, { width: 16 });
      RV(item.product_name || '', C.desc, { width: 180 });
      RV(item.hsn_code || '', C.hsn, { width: 45 });
      RV(item.unit || '', C.unit, { width: 36 });
      RV(Number(item.quantity).toFixed(3), C.qty, { width: 40, align: 'right' });
      RV(Number(item.rate).toFixed(2), C.rate, { width: 46, align: 'right' });
      RV(Number(item.amount).toFixed(2), C.amount, { width: 46, align: 'right' });
      RV(`${item.gst_rate || 0}%`, C.gst, { width: 34, align: 'right' });
      doc.fillColor(NAVY).font('Helvetica-Bold');
      RV(Number(item.total_amount).toFixed(2), C.total, { width: 46, align: 'right' });
      y += rowH;
    });

    // separator line under items
    doc.rect(ML, y, CW, 1).fill(DIVIDER);
    y += 10;

    // ── Totals block ──────────────────────────────────────────────
    const totW = 195;
    const totX = ML + CW - totW;

    const addTotRow = (label: string, value: string, accent = false, big = false) => {
      if (big) {
        doc.rect(totX - 2, y - 2, totW + 2, 20).fill(NAVY);
        doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(9.5);
        doc.text(label, totX + 4, y + 2, { width: totW / 2 });
        doc.text(value, totX + totW / 2, y + 2, { width: totW / 2 - 4, align: 'right' });
        y += 22;
      } else {
        doc.fillColor(accent ? GOLD : MUTED).font(accent ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
        doc.text(label, totX + 4, y, { width: totW / 2 });
        doc.fillColor(accent ? GOLD : BLACK).font(accent ? 'Helvetica-Bold' : 'Helvetica');
        doc.text(value, totX + totW / 2, y, { width: totW / 2 - 4, align: 'right' });
        y += 14;
      }
    };

    addTotRow('Subtotal', INR(sale.subtotal));
    if (Number(sale.discount_amount) > 0) addTotRow('Discount', `−${INR(sale.discount_amount)}`);
    addTotRow('Taxable Amount', INR(sale.taxable_amount));
    if (Number(sale.cgst_amount) > 0) addTotRow('CGST', INR(sale.cgst_amount));
    if (Number(sale.sgst_amount) > 0) addTotRow('SGST', INR(sale.sgst_amount));
    if (Number(sale.igst_amount) > 0) addTotRow('IGST', INR(sale.igst_amount));
    y += 4;
    addTotRow('GRAND TOTAL', INR(sale.grand_total), false, true);
    if (Number(sale.amount_received) > 0) addTotRow('Amount Received', INR(sale.amount_received), true);
    if (Number(sale.balance_due) > 0) addTotRow('Balance Due', INR(sale.balance_due), true);

    y += 18;

    // ── Bank details (left) ───────────────────────────────────────
    const bankY = y;
    if (company?.bank_name) {
      doc.rect(ML, bankY, 200, 58).fill(LIGHT).stroke(DIVIDER);
      doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(7.5).text('BANK DETAILS', ML + 10, bankY + 8);
      doc.moveTo(ML + 10, bankY + 17).lineTo(ML + 52, bankY + 17).lineWidth(1).stroke(GOLD);
      const bRows = [
        ['Bank', company.bank_name],
        ['Account', company.bank_account],
        ['IFSC', company.bank_ifsc],
        company.bank_branch ? ['Branch', company.bank_branch] : null,
      ].filter(Boolean) as string[][];
      bRows.forEach(([lbl, val], i) => {
        doc.fillColor(MUTED).font('Helvetica').fontSize(7.5)
          .text(lbl + ':', ML + 10, bankY + 22 + i * 10);
        doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(7.5)
          .text(val, ML + 48, bankY + 22 + i * 10);
      });
    }

    // ── Authorised signatory (right, bottom) ─────────────────────
    const sigX = ML + CW - 160;
    const sigY = bankY + 4;
    doc.rect(sigX, sigY, 160, 50).fill(LIGHT).stroke(DIVIDER);
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(7.5)
      .text('For ' + companyName, sigX + 10, sigY + 8, { width: 140 });
    // signature line
    doc.moveTo(sigX + 10, sigY + 38).lineTo(sigX + 150, sigY + 38).lineWidth(0.5).stroke(DIVIDER);
    doc.fillColor(MUTED).font('Helvetica').fontSize(7)
      .text('Authorised Signatory', sigX + 10, sigY + 40, { width: 140, align: 'center' });

    y = bankY + 66;

    // ── Terms ─────────────────────────────────────────────────────
    if (company?.terms_conditions) {
      doc.rect(ML, y, CW, 22).fill(LIGHT).stroke(DIVIDER);
      doc.fillColor(MUTED).font('Helvetica').fontSize(7)
        .text(company.terms_conditions, ML + 8, y + 6, { width: CW - 16, lineGap: 2 });
      y += 26;
    }

    // ── Footer strip ──────────────────────────────────────────────
    const footerY = 808;
    doc.rect(0, footerY, PW, 28).fill(NAVY);
    doc.rect(0, footerY, PW, 2).fill(GOLD);
    doc.fillColor('rgba(255,255,255,0.45)').font('Helvetica').fontSize(7)
      .text('This is a computer-generated document and does not require a physical signature.',
        ML, footerY + 10, { width: CW, align: 'center' });

    doc.end();
  });
}
