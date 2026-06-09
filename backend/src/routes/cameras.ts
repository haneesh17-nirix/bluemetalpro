import { Router } from 'express';
import { query, queryOne } from '../config/db';
import { authenticate, authorize } from '../middleware/auth';
import axios from 'axios';

export const camerasRouter = Router();
camerasRouter.use(authenticate);

// List cameras
camerasRouter.get('/', async (req, res) => {
  const rows = await query(
    'SELECT * FROM cameras WHERE is_active = true ORDER BY sort_order'
  );
  res.json(rows);
});

// Add camera
camerasRouter.post('/', authorize('admin'), async (req, res) => {
  const { name, location_label, rtsp_url, sort_order } = req.body;
  // HLS URL is the MediaMTX path based on camera id
  const cam = await queryOne(
    `INSERT INTO cameras (name, location_label, rtsp_url, sort_order)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [name, location_label, rtsp_url, sort_order || 0]
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
      await query('UPDATE cameras SET hls_url = $1 WHERE id = $2', [hlsUrl, (cam as any).id]);
      (cam as any).hls_url = hlsUrl;
    } catch (err) {
      console.error('MediaMTX registration failed:', err);
    }
  }
  res.status(201).json(cam);
});

// Update camera
camerasRouter.put('/:id', authorize('admin'), async (req, res) => {
  const { name, location_label, rtsp_url, sort_order, is_active } = req.body;
  const cam = await queryOne(
    `UPDATE cameras SET name=$1, location_label=$2, rtsp_url=$3, sort_order=$4, is_active=$5, updated_at=now()
     WHERE id=$6 RETURNING *`,
    [name, location_label, rtsp_url, sort_order, is_active, req.params.id]
  );
  res.json(cam);
});

// Stream health check (pings MediaMTX)
camerasRouter.get('/health', async (req, res) => {
  const cameras = await query('SELECT id, name FROM cameras WHERE is_active = true');
  if (!process.env.MEDIAMTX_API_URL) {
    return res.json(cameras.map((c: any) => ({ ...c, status: 'unknown' })));
  }
  const health = await Promise.all(cameras.map(async (cam: any) => {
    try {
      const r = await axios.get(`${process.env.MEDIAMTX_API_URL}/v3/paths/get/cam-${cam.id}`, { timeout: 3000 });
      const ready = r.data?.ready === true;
      return { cameraId: cam.id, name: cam.name, status: ready ? 'online' : 'offline' };
    } catch {
      return { cameraId: cam.id, name: cam.name, status: 'offline' };
    }
  }));
  res.json(health);
});

// Get snapshot URL for a camera
camerasRouter.get('/:id/snapshot', async (req, res) => {
  const cam = await queryOne('SELECT * FROM cameras WHERE id = $1', [req.params.id]);
  if (!cam) return res.status(404).json({ error: 'Camera not found' });
  // MediaMTX snapshot endpoint
  const snapshotUrl = process.env.MEDIAMTX_HLS_URL
    ? `${process.env.MEDIAMTX_HLS_URL}/cam-${req.params.id}/snapshot.jpg`
    : null;
  res.json({ snapshot_url: snapshotUrl });
});
