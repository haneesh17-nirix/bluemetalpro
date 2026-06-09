/**
 * BlueMetal Pro — Weighbridge Edge Agent
 *
 * Runs as a Windows Service on the on-site weighbridge PC.
 * Reads weight data from a RS-232/USB serial port and pushes
 * stable weight readings to the BlueMetal Pro cloud backend.
 *
 * Install as Windows service:
 *   npm run install-service
 *
 * Run in development:
 *   npm run dev
 */

import dotenv from 'dotenv';
dotenv.config();

import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import WebSocket, { WebSocketServer } from 'ws';
import axios from 'axios';
import { parseWeightString, formatWeight } from '../../shared/src/utils/parsers';
import type { RawWeightFrame, WeighbridgeConfig, EdgeWeightPayload } from '../../shared/src/types/weighbridge';

const config: WeighbridgeConfig = {
  id: process.env.WEIGHBRIDGE_ID || 'wb-001',
  name: process.env.WEIGHBRIDGE_NAME || 'Main Gate Scale',
  type: 'serial',
  comPort: process.env.COM_PORT || 'COM3',
  baudRate: parseInt(process.env.BAUD_RATE || '9600'),
  dataBits: 8,
  stopBits: 1,
  parity: 'none',
  stableThresholdKg: 20,
  maxCapacityKg: parseInt(process.env.MAX_CAPACITY_KG || '60000'),
  locationLabel: process.env.LOCATION_LABEL || 'Main gate',
};

const API_URL = process.env.API_URL || 'http://localhost:3001/api';
const API_KEY = process.env.WEIGHBRIDGE_API_KEY || '';
const WS_PORT = parseInt(process.env.WS_PORT || '8765');

let lastStableWeight: RawWeightFrame | null = null;
let lastPushedWeight = 0;
let consecutiveStableReadings = 0;
const STABLE_READINGS_REQUIRED = 3;

// ─── Local WebSocket server ─────────────────────────────────────────────────
// The Next.js web dashboard (running on the same LAN) connects here to get
// live weight updates without having to poll the cloud backend.
const wss = new WebSocketServer({ port: WS_PORT });
wss.on('listening', () => console.log(`[WS] Local WebSocket server on ws://localhost:${WS_PORT}`));

function broadcastToLocal(frame: RawWeightFrame) {
  const msg = JSON.stringify({ type: 'weight', data: frame });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}

// ─── Push to cloud backend ──────────────────────────────────────────────────
async function pushToCloud(frame: RawWeightFrame, vehicleNumber?: string) {
  try {
    const payload: EdgeWeightPayload = {
      weighbridgeId: config.id,
      apiKey: API_KEY,
      weight: frame,
      vehicleNumber,
    };
    await axios.post(`${API_URL}/weighbridge/ingest`, payload, { timeout: 5000 });
    console.log(`[CLOUD] Pushed ${formatWeight(frame.value)} at ${frame.timestamp}`);
  } catch (err: any) {
    // Non-fatal: queue locally if cloud is unreachable
    console.error(`[CLOUD] Push failed: ${err.message}`);
  }
}

// ─── Serial port listener ───────────────────────────────────────────────────
function startSerial() {
  console.log(`[SERIAL] Opening ${config.comPort} @ ${config.baudRate} baud…`);

  const port = new SerialPort({
    path: config.comPort!,
    baudRate: config.baudRate || 9600,
    dataBits: config.dataBits || 8,
    stopBits: config.stopBits || 1,
    parity: config.parity || 'none',
    autoOpen: false,
  });

  const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

  port.open(err => {
    if (err) {
      console.error(`[SERIAL] Failed to open port: ${err.message}`);
      setTimeout(startSerial, 10_000); // retry after 10s
      return;
    }
    console.log(`[SERIAL] Port open — listening for weight data…`);
  });

  parser.on('data', (line: string) => {
    const frame = parseWeightString(line);
    if (!frame) return;

    // Broadcast live to local LAN clients (web dashboard)
    broadcastToLocal(frame);

    // Only push stable, non-zero weights that have changed significantly
    if (frame.status !== 'stable' || frame.value <= 0) {
      consecutiveStableReadings = 0;
      return;
    }

    consecutiveStableReadings++;
    if (consecutiveStableReadings < STABLE_READINGS_REQUIRED) return;

    // Debounce: only push if weight changed by more than threshold
    const delta = Math.abs(frame.value - lastPushedWeight);
    if (delta < (config.stableThresholdKg || 20)) return;

    lastStableWeight = frame;
    lastPushedWeight = frame.value;
    consecutiveStableReadings = 0;

    console.log(`[WEIGHT] Stable: ${formatWeight(frame.value)}`);
    pushToCloud(frame);
  });

  port.on('error', (err) => {
    console.error(`[SERIAL] Port error: ${err.message}`);
    setTimeout(startSerial, 10_000);
  });

  port.on('close', () => {
    console.warn('[SERIAL] Port closed. Reopening in 5s…');
    setTimeout(startSerial, 5_000);
  });
}

// ─── HTTP API for desktop operator UI ──────────────────────────────────────
// Simple local HTTP server so the Next.js desktop app can also fetch weight
// on-demand without relying on the WebSocket.
import http from 'http';

const httpServer = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.url === '/weight' && req.method === 'GET') {
    res.end(JSON.stringify({ weight: lastStableWeight, timestamp: new Date().toISOString() }));
  } else if (req.url === '/health' && req.method === 'GET') {
    res.end(JSON.stringify({ status: 'ok', config: { id: config.id, name: config.name, port: config.comPort } }));
  } else {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

httpServer.listen(parseInt(process.env.HTTP_PORT || '8766'), () => {
  console.log(`[HTTP] Local API on http://localhost:${process.env.HTTP_PORT || '8766'}`);
});

// ─── Start ──────────────────────────────────────────────────────────────────
console.log(`
  ██████╗ ██╗     ██╗   ██╗███████╗███╗   ███╗███████╗████████╗ █████╗ ██╗
  ██╔══██╗██║     ██║   ██║██╔════╝████╗ ████║██╔════╝╚══██╔══╝██╔══██╗██║
  ██████╔╝██║     ██║   ██║█████╗  ██╔████╔██║█████╗     ██║   ███████║██║
  ██╔══██╗██║     ██║   ██║██╔══╝  ██║╚██╔╝██║██╔══╝     ██║   ██╔══██║██║
  ██████╔╝███████╗╚██████╔╝███████╗██║ ╚═╝ ██║███████╗   ██║   ██║  ██║███████╗
  ╚═════╝ ╚══════╝ ╚═════╝ ╚══════╝╚═╝     ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚══════╝
  Weighbridge Agent v1.1.0 — ${config.name}
`);

startSerial();
