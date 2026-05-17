/**
 * Admin-level IoT device management server functions.
 * These proxy authenticated endpoints that require an IoT platform JWT.
 *
 * To use: set IOT_ADMIN_TOKEN in .env (get it by calling POST /api/v1/auth/login).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { iotClient } from "@/lib/iot-api";
import type { IoT } from "@/lib/iot-api";

function getAdminToken(): string {
  const token = process.env.IOT_ADMIN_TOKEN;
  if (!token) throw new Error("IOT_ADMIN_TOKEN not configured — login to IoT platform first");
  return token;
}

// ─── Login to IoT Platform (one-time setup helper) ──────────────────────────

const LoginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const iotLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { email: string; password: string }) => LoginInput.parse(i))
  .handler(async ({ data }): Promise<IoT.Token> => {
    return iotClient.login(data);
  });

// ─── List All Devices ───────────────────────────────────────────────────────

export const iotListDevices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<IoT.DeviceOut[]> => {
    return iotClient.listDevices(getAdminToken());
  });

// ─── Create Device ──────────────────────────────────────────────────────────

const CreateDeviceInput = z.object({
  name: z.string().min(1).max(200),
  description: z.string().default(""),
  device_type: z.string().default("generic"),
  meta: z.record(z.string(), z.any()).default({}),
});

export const iotCreateDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { name: string; description?: string; device_type?: string; meta?: Record<string, unknown> }) =>
    CreateDeviceInput.parse(i)
  )
  .handler(async ({ data }): Promise<IoT.DeviceOut> => {
    return iotClient.createDevice(getAdminToken(), data);
  });

// ─── Get Device Details ─────────────────────────────────────────────────────

const DeviceIdInput = z.object({ deviceId: z.string().min(1) });

export const iotGetDevice = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { deviceId: string }) => DeviceIdInput.parse(i))
  .handler(async ({ data }): Promise<IoT.DeviceOut> => {
    return iotClient.getDevice(getAdminToken(), data.deviceId);
  });

// ─── Update Device ──────────────────────────────────────────────────────────

const UpdateDeviceInput = z.object({
  deviceId: z.string().min(1),
  name: z.string().nullish(),
  description: z.string().nullish(),
  device_type: z.string().nullish(),
  is_active: z.boolean().nullish(),
  meta: z.record(z.string(), z.any()).nullish(),
});

export const iotUpdateDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: {
    deviceId: string;
    name?: string | null;
    description?: string | null;
    device_type?: string | null;
    is_active?: boolean | null;
    meta?: Record<string, unknown> | null;
  }) => UpdateDeviceInput.parse(i))
  .handler(async ({ data }): Promise<IoT.DeviceOut> => {
    const { deviceId, ...body } = data;
    return iotClient.updateDevice(getAdminToken(), deviceId, body);
  });

// ─── Delete Device ──────────────────────────────────────────────────────────

export const iotDeleteDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { deviceId: string }) => DeviceIdInput.parse(i))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    await iotClient.deleteDevice(getAdminToken(), data.deviceId);
    return { ok: true };
  });

// ─── Regenerate API Key ─────────────────────────────────────────────────────

export const iotRegenerateKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { deviceId: string }) => DeviceIdInput.parse(i))
  .handler(async ({ data }): Promise<IoT.DeviceOut> => {
    return iotClient.regenerateApiKey(getAdminToken(), data.deviceId);
  });
