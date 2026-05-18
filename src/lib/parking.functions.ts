import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  iotClient,
  DevicesWithDataResponseSchema,
  buildMockDevices,
  shouldForceMock,
} from "@/lib/iot-api";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Device } from "./parking.types";

interface FetchDevicesResult {
  devices: Device[];
  error: string | null;
  fetchedAt: string;
  /** True nếu data đến từ mock fallback (IoT API tắt hoặc IOT_USE_MOCK=1). */
  mock?: boolean;
}

/**
 * Server function: proxies the IoT parking API.
 * Hides credentials and the backend URL from the client.
 *
 * Fallback strategy:
 *   1. Nếu IOT_USE_MOCK=1 → trả mock thẳng (skip API).
 *   2. Nếu API fail (network/timeout/non-200) → trả mock + flag `mock: true`
 *      để vẫn cho phép đặt chỗ và test luồng SePay khi IoT offline.
 */
export const fetchDevices = createServerFn({ method: "GET" }).handler(
  async (): Promise<FetchDevicesResult> => {
    const fetchedAt = new Date().toISOString();

    if (shouldForceMock()) {
      return {
        devices: buildMockDevices(),
        error: null,
        fetchedAt,
        mock: true,
      };
    }

    try {
      const raw = await iotClient.listDevicesWithData();
      const parsed = DevicesWithDataResponseSchema.safeParse(raw);
      if (!parsed.success) {
        return {
          devices: buildMockDevices(),
          error: `Invalid response shape: ${parsed.error.message.slice(0, 200)} (using mock data)`,
          fetchedAt,
          mock: true,
        };
      }
      // Nếu API thật trả 0 device → vẫn fallback mock để dev có gì test
      if (parsed.data.length === 0) {
        return {
          devices: buildMockDevices(),
          error: null,
          fetchedAt,
          mock: true,
        };
      }
      return { devices: parsed.data, error: null, fetchedAt, mock: false };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return {
        devices: buildMockDevices(),
        error: `IoT offline (using mock): ${message}`,
        fetchedAt,
        mock: true,
      };
    }
  }
);

/**
 * Get latest sensor data for a specific device (authenticated).
 */
const DeviceIdInput = z.object({ deviceId: z.string().min(1) });

export const fetchDeviceLatest = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { deviceId: string }) => DeviceIdInput.parse(i))
  .handler(async ({ data, context }) => {
    // Use IoT platform's own auth if token available, otherwise fallback to api key
    try {
      const iotToken = process.env.IOT_ADMIN_TOKEN;
      if (iotToken) {
        return await iotClient.getLatestValues(iotToken, data.deviceId);
      }
      // Fallback: use the public with-data endpoint and filter
      const devices = await iotClient.listDevicesWithData();
      const device = devices.find(
        (d) => d.sensor_data.some((s) => s.device_id === data.deviceId)
      );
      return device?.sensor_data ?? [];
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      throw new Error(`Cannot fetch device latest: ${msg}`);
    }
  });

/**
 * Get historical data for a device.
 */
const HistoryInput = z.object({
  deviceId: z.string().min(1),
  start: z.string().optional(),
  end: z.string().optional(),
  limit: z.number().int().min(1).max(10000).default(100),
});

export const fetchDeviceHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { deviceId: string; start?: string; end?: string; limit?: number }) =>
    HistoryInput.parse(i)
  )
  .handler(async ({ data }): Promise<import("@/lib/iot-api").IoT.SensorDataOut[]> => {
    const iotToken = process.env.IOT_ADMIN_TOKEN;
    if (!iotToken) throw new Error("IOT_ADMIN_TOKEN not configured");
    return iotClient.getHistory(iotToken, data.deviceId, {
      start: data.start,
      end: data.end,
      limit: data.limit,
    });
  });

/**
 * Get aggregated occupancy stats for a device.
 */
const StatsInput = z.object({
  deviceId: z.string().min(1),
  hours: z.number().int().min(1).max(720).default(24),
});

export const fetchDeviceStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { deviceId: string; hours?: number }) => StatsInput.parse(i))
  .handler(async ({ data }): Promise<Record<string, string | number | boolean | null>> => {
    const iotToken = process.env.IOT_ADMIN_TOKEN;
    if (!iotToken) throw new Error("IOT_ADMIN_TOKEN not configured");
    return (await iotClient.getFieldStats(iotToken, data.deviceId, data.hours)) as Record<string, string | number | boolean | null>;
  });

/**
 * Get latest events across all devices.
 */
const EventsInput = z.object({
  limit: z.number().int().min(1).max(100).default(20),
});

export const fetchLatestEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { limit?: number }) => EventsInput.parse(i))
  .handler(async ({ data }): Promise<Array<Record<string, string | number | boolean | null>>> => {
    const iotToken = process.env.IOT_ADMIN_TOKEN;
    if (!iotToken) throw new Error("IOT_ADMIN_TOKEN not configured");
    return (await iotClient.getLatestEvents(iotToken, data.limit)) as Array<Record<string, string | number | boolean | null>>;
  });

/**
 * Send lock/unlock command to a device slot.
 */
const LockInput = z.object({
  deviceId: z.string().min(1),
  slot_number: z.string().min(1),
  locked: z.boolean(),
});

export const sendLockCommand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { deviceId: string; slot_number: string; locked: boolean }) =>
    LockInput.parse(i)
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    await iotClient.sendLockCommand(data.deviceId, {
      slot_number: data.slot_number,
      locked: data.locked,
    });
    return { ok: true };
  });

/**
 * Get all slots overview.
 */
export const fetchSlots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<Record<string, string | number | boolean | null>> => {
    const iotToken = process.env.IOT_ADMIN_TOKEN;
    if (!iotToken) throw new Error("IOT_ADMIN_TOKEN not configured");
    return (await iotClient.getSlots(iotToken)) as Record<string, string | number | boolean | null>;
  });

/**
 * Health check for the IoT platform.
 */
export const checkIotHealth = createServerFn({ method: "GET" }).handler(async () => {
  try {
    await iotClient.healthCheck();
    return { status: "ok" as const, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { status: "error" as const, error: msg };
  }
});
