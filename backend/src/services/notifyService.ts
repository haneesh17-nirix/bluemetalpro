import { query } from '../config/db';
import { logger } from '../utils/logger';
import { Response } from 'express';

export type NotifyEvent = 'sale' | 'purchase' | 'maintenance' | 'quarry' | 'wages' | 'payment';

export interface NotifyPayload {
  type: NotifyEvent;
  title: string;
  body: string;
  reference_id?: string;
  metadata?: Record<string, unknown>;
}

// SSE client registry: crusher_id -> Set of Response streams
const clients = new Map<string, Set<Response>>();

export function registerSSEClient(crusher_id: string, res: Response) {
  if (!clients.has(crusher_id)) clients.set(crusher_id, new Set());
  clients.get(crusher_id)!.add(res);
  logger.debug({ crusher_id }, 'SSE client connected');
}

export function removeSSEClient(crusher_id: string, res: Response) {
  clients.get(crusher_id)?.delete(res);
  logger.debug({ crusher_id }, 'SSE client disconnected');
}

export async function fanOut(crusher_id: string, payload: NotifyPayload): Promise<void> {
  try {
    // Find all active users for this crusher who want this event type
    const targets = await query<{ id: string }>(
      `SELECT DISTINCT u.id FROM users u
       JOIN user_crusher_access uca ON uca.user_id = u.id AND uca.crusher_id = $1
       WHERE u.is_active = true
         AND u.role IN ('admin','accounts','report_viewer','partner')
         AND (u.notify_events IS NULL OR $2 = ANY(u.notify_events))`,
      [crusher_id, payload.type]
    );

    if (!targets.length) return;

    // Batch insert one notification row per target user
    const values = targets
      .map((_, i) => `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`)
      .join(',');
    const params = targets.flatMap(t => [
      t.id,
      payload.title,
      payload.body,
      payload.type,
      payload.reference_id ?? null,
      crusher_id,
    ]);

    const inserted = await query<{
      id: string;
      user_id: string;
      title: string;
      body: string;
      type: string;
      sent_at: string;
    }>(
      `INSERT INTO notifications (user_id, title, body, type, reference_id, crusher_id)
       VALUES ${values}
       RETURNING id, user_id, title, body, type, sent_at`,
      params
    );

    logger.info({ crusher_id, type: payload.type, recipients: targets.length }, 'Notifications fanned out');

    // Push to SSE clients
    const crushClients = clients.get(crusher_id);
    if (crushClients?.size) {
      const event = `data: ${JSON.stringify({ notifications: inserted })}\n\n`;
      for (const res of crushClients) {
        try { res.write(event); } catch { /* client disconnected */ }
      }
    }
  } catch (err) {
    logger.error({ err, crusher_id, payload }, 'fanOut failed');
  }
}
