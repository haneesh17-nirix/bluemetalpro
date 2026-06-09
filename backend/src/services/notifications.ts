import {
  NotificationHubsClient,
  createAppleNotification,
  createFcmV1Notification,
  type AppleNativeMessage,
  type FirebaseV1NativeMessage,
} from '@azure/notification-hubs';
import { query } from '../config/db';

const hubClient = process.env.AZURE_NOTIFICATION_HUB_CONNECTION_STRING
  ? new NotificationHubsClient(
      process.env.AZURE_NOTIFICATION_HUB_CONNECTION_STRING,
      process.env.AZURE_NOTIFICATION_HUB_NAME!
    )
  : null;

export async function sendSaleNotification(sale: any) {
  const title = 'New Sale Created';
  const body = `Invoice ${sale.invoice_number} — ₹${Number(sale.grand_total).toFixed(2)}${sale.party_name ? ` | ${sale.party_name}` : ''}`;

  await query(
    `INSERT INTO notifications (title, body, type, reference_id)
     VALUES ($1, $2, 'sale', $3)`,
    [title, body, sale.id]
  );

  if (!hubClient) return;

  try {
    const fcmBody: FirebaseV1NativeMessage = {
      notification: { title, body },
      data: { type: 'sale', sale_id: sale.id, invoice_number: sale.invoice_number },
    };
    await hubClient.sendNotification(createFcmV1Notification({ body: fcmBody }));

    const appleBody: AppleNativeMessage = {
      aps: { alert: { title, body }, sound: 'default', badge: 1 },
      type: 'sale',
      sale_id: sale.id,
    };
    await hubClient.sendNotification(createAppleNotification({ body: appleBody }));
  } catch (err) {
    console.error('Notification send failed:', err);
  }
}

export async function sendMaintenanceAlert(asset: any, record: any) {
  const title = 'Maintenance Due';
  const body = `${asset.name}: ${record.title} scheduled for ${record.scheduled_date}`;

  await query(
    `INSERT INTO notifications (title, body, type, reference_id) VALUES ($1, $2, 'maintenance', $3)`,
    [title, body, record.id]
  );

  if (!hubClient) return;

  try {
    const fcmBody: FirebaseV1NativeMessage = {
      notification: { title, body },
      data: { type: 'maintenance' },
    };
    await hubClient.sendNotification(createFcmV1Notification({ body: fcmBody }));
  } catch {}
}
