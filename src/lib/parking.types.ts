import { z } from "zod";

export const SensorDataSchema = z.object({
  id: z.string(),
  device_id: z.string(),
  floor: z.string(),
  slot_number: z.string(),
  is_occupied: z.boolean(),
  type: z.string(),
  timestamp: z.string(),
});

export const DeviceSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional().default(""),
  is_online: z.boolean(),
  last_seen: z.string().nullable().optional(),
  meta: z.record(z.string(), z.any()).nullable().optional().default({}),
  updated_at: z.string().nullable().optional(),
  sensor_data: z.array(SensorDataSchema).default([]),
});

export const DevicesResponseSchema = z.array(DeviceSchema);

export type SensorData = z.infer<typeof SensorDataSchema>;
export type Device = z.infer<typeof DeviceSchema>;

/**
 * Stable id derived from sensor device_id (since the API does not return a
 * top-level device id on the device object). Falls back to slugified name.
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
