import { Router } from 'express';
import { query, queryOne } from '../config/db';
import { authenticate, authorize, requireCrusher } from '../middleware/auth';
import axios from 'axios';
import { logger, logAction } from '../utils/logger';

export const camerasRouter = Router();
camerasRouter.use(authenticate);
camerasRouter.use(requireCrusher);

// List cameras
camerasRouter.get('/', async (req, res) => {
  const cid = req.user!.crusher_id!;
  try {
    const rows = await query(
      'SELECT * FROM cameras WHERE is_active = true AND crusher_id = $1 ORDER BY sort_order',
      [cid]
    );
    res.json(rows);
  } catch (err) {
    logger.error({ err, crusher_id: cid }, 'Failed to list cameras');
    return res.status(500).json({ error: 'Failed to list cameras' });
  }
});

// Add camera
camerasRouter.post('/', authorize('admin'), async (req, res) => {
  const cid = req.user!.crusher_id!;
  const { name, location_label, rtsp_url, sort_order } = req.body;
  try {
    const cam = await queryOne(
      `INSERT INTO cameras (name, location_label, rtsp_url, sort_order, crusher_id)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, location_label, rtsp_url, sort_order || 0, cid]
    );
    // Register stream with MediaMTX
    if (process.env.MEDIAMTX_API_URL) {
      try {
        await axios.post(`${process.env.MEDIAMTX_API_URL}/v3/config/paths/add/cam-${(cam as any).id}`, {
          source: rtsp_url,
          sourceOnDemand: true,
        });
        // Update hls_url after registration
        const hlsUrl = `${process.env.MEDIAMTX_HLS_URL}/cam-${(cam as any).id}/index.m3u8`;
        await query('UPDATE cameras SET hls_url = $1 WHERE id = $2 AND crusher_id = $3', [hlsUrl, (cam as any).id, cid]);
        (cam as any).hls_url = hlsUrl;
      } catch (err) {
        logAction('camera.mediamtx_registration_failed', { cameraId: (cam as any).id, error: String(err) }, 'error');
      }
    }
    logAction('camera.created', { cameraId: (cam as any).id, name, location: location_label, hls_url: (cam as any).hls_url, by: req.user!.email, crusher_id: cid });
    res.status(201).json(cam);
  } catch (err) {
    logger.error({ err, crusher_id: cid, name, rtsp_url }, 'Failed to create camera');
    return res.status(500).json({ error: 'Failed to create camera' });
  }
});

// Update camera
camerasRouter.put('/:id', authorize('admin'), async (req, res) => {
  const cid = req.user!.crusher_id!;
  const { name, location_label, rtsp_url, sort_order, is_active } = req.body;
  try {
    const cam = await queryOne(
      `UPDATE cameras SET name=$1, location_label=$2, rtsp_url=$3, sort_order=$4, is_active=$5, updated_at=now()
       WHERE id=$6 AND crusher_id=$7 RETURNING *`,
      [name, location_label, rtsp_url, sort_order, is_active, req.params.id, cid]
    );
    logAction('camera.updated', { cameraId: req.params.id, by: req.user!.email, name, rtsp_url, is_active });
    res.json(cam);
  } catch (err) {
    logger.error({ err, crusher_id: cid, cameraId: req.params.id, by: req.user!.email }, 'Failed to update camera');
    return res.status(500).json({ error: 'Failed to update camera' });
  }
});

// Stream health check (pings MediaMTX)
camerasRouter.get('/health', async (req, res) => {
  const cid = req.user!.crusher_id!;
  logger.debug({ crusher_id: cid }, 'Camera health check started');
  try {
    const cameras = await query('SELECT id, name FROM cameras WHERE is_active = true AND crusher_id = $1', [cid]);
    if (!process.env.MEDIAMTX_API_URL) {
      return res.json(cameras.map((c: any) => ({ ...c, status: 'unknown' })));
    }
    const health = await Promise.all(cameras.map(async (cam: any) => {
      try {
        const r = await axios.get(`${process.env.MEDIAMTX_API_URL}/v3/paths/get/cam-${cam.id}`, { timeout: 3000 });
        const ready = r.data?.ready === true;
        return { cameraId: cam.id, name: cam.name, status: ready ? 'online' : 'offline' };
      } catch (err) {
        logger.warn({ err, cameraId: cam.id, crusher_id: cid }, 'MediaMTX health check failed for camera');
        return { cameraId: cam.id, name: cam.name, status: 'offline' };
      }
    }));
    res.json(health);
  } catch (err) {
    logger.error({ err, crusher_id: cid }, 'Failed to fetch camera health');
    return res.status(500).json({ error: 'Failed to fetch camera health' });
  }
});

// Get snapshot URL for a camera
camerasRouter.get('/:id/snapshot', async (req, res) => {
  const cid = req.user!.crusher_id!;
  try {
    const cam = await queryOne('SELECT * FROM cameras WHERE id = $1 AND crusher_id = $2', [req.params.id, cid]);
    if (!cam) return res.status(404).json({ error: 'Camera not found' });
    // MediaMTX snapshot endpoint
    const snapshotUrl = process.env.MEDIAMTX_HLS_URL
      ? `${process.env.MEDIAMTX_HLS_URL}/cam-${req.params.id}/snapshot.jpg`
      : null;
    res.json({ snapshot_url: snapshotUrl });
  } catch (err) {
    logger.error({ err, crusher_id: cid, cameraId: req.params.id }, 'Failed to fetch camera for snapshot');
    return res.status(500).json({ error: 'Failed to fetch camera for snapshot' });
  }
});
