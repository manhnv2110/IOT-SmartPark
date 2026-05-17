/**
 * Parking types — re-exports from the IoT API module plus domain helpers.
 *
 * Existing imports like `import { Device } from "@/lib/parking.types"`
 * continue to work unchanged.
 */

import { z } from "zod";
import {
  SensorDataOutSchema,
  DeviceWithDataOutSchema,
  DevicesWithDataResponseSchema as _DevicesWithDataResponseSchema,
} from "@/lib/iot-api";

// Re-export schemas under their original names for backward compat
export const SensorDataSchema = SensorDataOutSchema;
export const DeviceSchema = DeviceWithDataOutSchema;
export const DevicesResponseSchema = _DevicesWithDataResponseSchema;

// Type aliases matching original names
export type SensorData = z.infer<typeof SensorDataSchema>;
export type Device = z.infer<typeof DeviceSchema>;

/**
 * Stable id derived from sensor device_id (since the with-data endpoint
 * does not return a top-level device id). Falls back to slugified name.
 */
export function getDeviceId(device: Device): string {
  if (device.sensor_data && device.sensor_data.length > 0) {
    return device.sensor_data[0].device_id;
  }
  return device.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export interface DeviceStats {
  total: number;
  occupied: number;
  available: number;
  occupancyRate: number; // 0..1
  byFloor: Record<string, { total: number; occupied: number; available: number }>;
}

export function computeStats(device: Device): DeviceStats {
  const total = device.sensor_data.length;
  const occupied = device.sensor_data.filter((s) => s.is_occupied).length;
  const available = total - occupied;
  const byFloor: DeviceStats["byFloor"] = {};
  for (const s of device.sensor_data) {
    if (!byFloor[s.floor]) byFloor[s.floor] = { total: 0, occupied: 0, available: 0 };
    byFloor[s.floor].total += 1;
    if (s.is_occupied) byFloor[s.floor].occupied += 1;
    else byFloor[s.floor].available += 1;
  }
  return {
    total,
    occupied,
    available,
    occupancyRate: total > 0 ? occupied / total : 0,
    byFloor,
  };
}
