/** Shared weighbridge types — used by edge agent, backend, web, and mobile */

export type WeightStatus = 'stable' | 'unstable' | 'overload' | 'underload' | 'zero' | 'error';
export type WeightUnit = 'kg' | 't' | 'lb';

/** Raw parsed frame from a serial indicator */
export interface RawWeightFrame {
  raw: string;              // original string from COM port
  status: WeightStatus;
  value: number;            // numeric weight
  unit: WeightUnit;
  isGross: boolean;         // true = gross weight, false = net/tare
  timestamp: string;        // ISO 8601
}

/** A complete weigh ticket (two-stage: gross in, tare out) */
export interface WeighTicket {
  id: string;
  ticketNumber: string;     // e.g. WT/2526/0001
  vehicleNumber: string;
  partyId?: string;
  partyName?: string;
  productId?: string;
  productName?: string;
  grossWeight: number;      // kg
  grossTimestamp: string;
  tareWeight: number;       // kg (second weighing / fixed tare)
  netWeight: number;        // kg — computed: gross - tare
  unit: WeightUnit;
  weighbridgeId: string;
  operatorId?: string;
  saleId?: string;          // linked to sales table after dispatch
  notes?: string;
  createdAt: string;
}

/** Configuration for a single weighbridge device */
export interface WeighbridgeConfig {
  id: string;
  name: string;             // e.g. "Main Gate Scale"
  type: 'serial' | 'ip' | 'cloud';
  // Serial
  comPort?: string;         // e.g. "COM3" or "/dev/ttyUSB0"
  baudRate?: number;        // e.g. 9600
  dataBits?: 5 | 6 | 7 | 8;
  stopBits?: 1 | 2;
  parity?: 'none' | 'even' | 'odd';
  // IP
  ipAddress?: string;
  port?: number;
  // Common
  pollIntervalMs?: number;  // how often to request weight (serial only)
  stableThresholdKg?: number; // treat reading as stable if within ±N kg
  maxCapacityKg?: number;
  locationLabel?: string;   // e.g. "Main gate", "Quarry exit"
}

/** Payload sent from edge agent → backend webhook */
export interface EdgeWeightPayload {
  weighbridgeId: string;
  apiKey: string;
  weight: RawWeightFrame;
  vehicleNumber?: string;
  ticketRef?: string;
}

/** Backend webhook response */
export interface WeightWebhookResponse {
  success: boolean;
  ticketId?: string;
  message?: string;
}
