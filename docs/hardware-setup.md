# Hardware Setup Guide

## Weighbridge Integration

### Prerequisites
- Windows PC on the same LAN as the weighbridge (Win 10/11)
- Node.js 20+ installed
- RS-232 serial cable (for legacy weighbridges) or network access (for IP-based)

### Edge Agent Installation

1. **Clone / copy** the `packages/weighbridge-agent` folder to the on-site PC.

2. **Install dependencies:**
   ```
   npm install
   npm run build
   ```

3. **Configure `.env`** (copy from `.env.example`):

   | Variable | Description |
   |----------|-------------|
   | `WEIGHBRIDGE_ID` | UUID from the `weighbridges` table in your DB |
   | `COM_PORT` | e.g. `COM3`, `COM4` |
   | `BAUD_RATE` | Usually `9600` or `19200` |
   | `API_URL` | Your Azure API URL, e.g. `https://bluemetal-prod-api.azurewebsites.net` |
   | `WEIGHBRIDGE_API_KEY` | The `api_key` value from `weighbridges` table |
   | `WS_PORT` | Local WebSocket port (default `8765`) |
   | `HTTP_PORT` | Local HTTP port (default `8766`) |

4. **Install as Windows Service** (run once, as Administrator):
   ```
   node dist/install-service.js
   ```
   The service starts automatically and restarts on reboot.

5. **Verify:** Open `http://localhost:8766/health` in a browser — should return `{"status":"ok","weight":...}`.

### Adding a Weighbridge in the Admin Panel

1. Log in as admin → Settings → Weighbridges → Add Weighbridge
2. Set `type` to `serial` (legacy) or `ip` (IP-based)
3. Copy the generated `api_key` to the edge agent's `.env`

### Supported Weighbridge Formats

The shared parser (`@bluemetal/shared`) supports:
- **Avery** — `ST,GS,   32450kg`
- **Mettler-Toledo** — `S S     32.450 t`
- **Generic ST indicator** — `ST,     32450`
- **Bare numeric** — `32450`

For unsupported formats, open `packages/shared/src/utils/parsers.ts` and add a new parser function.

### IP-based / Cloud Weighbridges

POST directly to:
```
POST https://<your-api>/api/weighbridge/ingest
Content-Type: application/json

{
  "weighbridgeId": "<uuid>",
  "apiKey": "<api_key>",
  "weight": {
    "value": 32450,
    "unit": "kg",
    "status": "stable",
    "raw": "32450"
  },
  "vehicleNumber": "KL-01-AB-1234"
}
```

---

## CCTV Camera Integration

### Requirements
- IP cameras that expose an RTSP stream (most Hikvision, Dahua, Reolink, etc.)
- Network path from the camera to the Azure Container App (via VPN or public RTSP port)

### Network Options

**Option A — Azure VPN Gateway**
- Set up a Site-to-Site VPN between your on-premise router and the Azure VNet.
- MediaMTX Container App is placed in the VNet; it pulls RTSP over the VPN tunnel.

**Option B — Tailscale (simpler)**
- Install Tailscale on an on-site Linux/Windows machine that can see the cameras.
- Install Tailscale on the MediaMTX container (add to the container image).
- Use Tailscale IPs in RTSP URLs.

**Option C — Port forwarding (least secure)**
- Forward RTSP port (554) on your router to each camera.
- Use the public IP in RTSP URLs. Only suitable for testing.

### Adding a Camera

1. Admin panel → Live Cameras → Add Camera
2. Enter the RTSP URL: `rtsp://user:pass@192.168.1.x:554/stream1`
3. The backend calls MediaMTX to register the stream path automatically.
4. The HLS URL (`…/hls/cam-<uuid>/index.m3u8`) is stored and served to web/mobile clients.

### MediaMTX Default Ports

| Port | Protocol | Purpose |
|------|----------|---------|
| 8554 | RTSP | Ingest from cameras |
| 8888 | HTTP | HLS output to players |
| 9997 | HTTP | REST API (internal only) |

### Testing a Stream

```bash
# Check HLS endpoint
curl -I https://<mediamtx-url>/hls/cam-<uuid>/index.m3u8

# Play in VLC
vlc rtsp://<your-mediamtx-fqdn>:8554/cam-<uuid>
```
