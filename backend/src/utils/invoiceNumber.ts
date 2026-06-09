import { PoolClient } from 'pg';

export async function generateInvoiceNumber(client: PoolClient, crusherId: string): Promise<string> {
  const result = await client.query(
    `UPDATE crushers SET invoice_counter = invoice_counter + 1
     WHERE id = $1
     RETURNING invoice_prefix, invoice_counter,
               EXTRACT(YEAR FROM now()) as year, EXTRACT(MONTH FROM now()) as month`,
    [crusherId]
  );
  const { invoice_prefix, invoice_counter, year, month } = result.rows[0];
  const fy = Number(month) >= 4
    ? `${String(year).slice(2)}${String(Number(year) + 1).slice(2)}`
    : `${String(Number(year) - 1).slice(2)}${String(year).slice(2)}`;
  return `${invoice_prefix}/${fy}/${String(invoice_counter).padStart(4, '0')}`;
}

export async function generateQuarryInvoiceNumber(client: PoolClient, crusherId: string): Promise<string> {
  const result = await client.query(
    `UPDATE crushers SET quarry_invoice_counter = quarry_invoice_counter + 1
     WHERE id = $1
     RETURNING quarry_invoice_prefix, quarry_invoice_counter,
               EXTRACT(YEAR FROM now()) as year, EXTRACT(MONTH FROM now()) as month`,
    [crusherId]
  );
  const { quarry_invoice_prefix, quarry_invoice_counter, year, month } = result.rows[0];
  const fy = Number(month) >= 4
    ? `${String(year).slice(2)}${String(Number(year) + 1).slice(2)}`
    : `${String(Number(year) - 1).slice(2)}${String(year).slice(2)}`;
  return `${quarry_invoice_prefix}/${fy}/${String(quarry_invoice_counter).padStart(4, '0')}`;
}
