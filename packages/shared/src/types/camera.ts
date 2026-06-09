/** Shared camera / CCTV types */

export type StreamProtocol = 'rtsp' | 'hls' | 'webrtc';
export type CameraStatus = 'online' | 'offline' | 'error' | 'unknown';

export interface CameraConfig {
  id: string;
  name: string;             // e.g. "Weighbridge Gate", "Crusher Area"
  locationLabel: string;
  rtspUrl: string;          // source: rtsp://admin:pass@192.168.1.100:554/stream1
  hlsUrl?: string;          // transcoded HLS output from MediaMTX
  thumbnailUrl?: string;    // periodic snapshot stored in Azure Blob
  status?: CameraStatus;
  isActive: boolean;
  sortOrder: number;
}

export interface StreamHealth {
  cameraId: string;
  status: CameraStatus;
  lastSeenAt: string;
  latencyMs?: number;
  bitratekbps?: number;
}
