/**
 * IoT Platform API Client
 *
 * Low-level HTTP client for the NexusIoT Platform.
 * Runs server-side only — never import this in client bundles.
 * All methods throw on non-OK responses with structured messages.
 */

import type {
  DeviceCreate,
  DeviceOut,
  DeviceUpdate,
  DeviceWithDataOut,
  LockCommand,
  SensorDataBulk,
  SensorDataIngest,
  SensorDataOut,
  Token,
  UserCreate,
  UserLogin,
  UserOut,
} from "./types";

// ─── Config ─────────────────────────────────────────────────────────────────

function getBaseUrl(): string {
  const url = process.env.IOT_API_URL || process.env.PARKING_API_URL || "";
  if (!url) throw new Error("[IoT Client] Missing IOT_API_URL env var");
  return url.replace(/\/$/, "");
}

function getApiKey(): string {
  return process.env.IOT_API_KEY || process.env.PARKING_API_KEY || "";
}

// ─── Helpers ────────────────────────────────────────────────────────────────

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

interface RequestOptions {
  method: HttpMethod;
  path: string;
  body?: unknown;
  token?: string; // Bearer token for authenticated endpoints
  apiKey?: string; // X-API-Key for device endpoints
  params?: Record<string, string | number | undefined>;
  timeoutMs?: number;
}

async function request<T = unknown>(opts: RequestOptions): Promise<T> {
  const base = getBaseUrl();
  const url = new URL(opts.path, base);

  if (opts.params) {
    for (const [k, v] of Object.entries(opts.params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {
    accept: "application/json",
    "ngrok-skip-browser-warning": "true",
  };

  if (opts.token) {
    headers["Authorization"] = `Bearer ${opts.token}`;
  }
  if (opts.apiKey) {
    headers["X-API-Key"] = opts.apiKey;
  }
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 10_000);

  try {
    const res = await fetch(url.toString(), {
      method: opts.method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.status === 204) return undefined as T;

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `IoT API ${opts.method} ${opts.path} → ${res.status}: ${text.slice(0, 300)}`
      );
    }

    return (await res.json()) as T;
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`IoT API ${opts.method} ${opts.path} → timeout`);
    }
    throw err;
  }
}

// ─── Auth Endpoints ─────────────────────────────────────────────────────────

export async function register(data: UserCreate): Promise<UserOut> {
  return request<UserOut>({
    method: "POST",
    path: "/api/v1/auth/register",
    body: data,
  });
}

export async function login(data: UserLogin): Promise<Token> {
  return request<Token>({
    method: "POST",
    path: "/api/v1/auth/login",
    body: data,
  });
}

// ─── Device Endpoints (authenticated) ───────────────────────────────────────

export async function listDevices(token: string): Promise<DeviceOut[]> {
  return request<DeviceOut[]>({
    method: "GET",
    path: "/api/v1/devices",
    token,
  });
}

export async function createDevice(
  token: string,
  data: DeviceCreate
): Promise<DeviceOut> {
  return request<DeviceOut>({
    method: "POST",
    path: "/api/v1/devices",
    token,
    body: data,
  });
}

export async function getDevice(
  token: string,
  deviceId: string
): Promise<DeviceOut> {
  return request<DeviceOut>({
    method: "GET",
    path: `/api/v1/devices/${deviceId}`,
    token,
  });
}

export async function updateDevice(
  token: string,
  deviceId: string,
  data: DeviceUpdate
): Promise<DeviceOut> {
  return request<DeviceOut>({
    method: "PATCH",
    path: `/api/v1/devices/${deviceId}`,
    token,
    body: data,
  });
}

export async function deleteDevice(
  token: string,
  deviceId: string
): Promise<void> {
  await request<void>({
    method: "DELETE",
    path: `/api/v1/devices/${deviceId}`,
    token,
  });
}

export async function regenerateApiKey(
  token: string,
  deviceId: string
): Promise<DeviceOut> {
  return request<DeviceOut>({
    method: "POST",
    path: `/api/v1/devices/${deviceId}/regenerate-key`,
    token,
  });
}

// ─── Devices With Data (public / apiKey header) ─────────────────────────────

export async function listDevicesWithData(
  apiKey?: string
): Promise<DeviceWithDataOut[]> {
  const key = apiKey || getApiKey();
  const base = getBaseUrl();
  const url = `${base}/api/v1/devices/with-data`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        apiKey: key,
        "ngrok-skip-browser-warning": "true",
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `IoT API GET /api/v1/devices/with-data → ${res.status}: ${text.slice(0, 300)}`
      );
    }

    return (await res.json()) as DeviceWithDataOut[];
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("IoT API GET /api/v1/devices/with-data → timeout");
    }
    throw err;
  }
}

// ─── Lock Command ───────────────────────────────────────────────────────────

export async function sendLockCommand(
  deviceId: string,
  data: LockCommand
): Promise<unknown> {
  return request({
    method: "POST",
    path: `/api/v1/devices/${deviceId}/command/lock`,
    body: data,
  });
}

// ─── Data Ingest (device auth via X-API-Key) ────────────────────────────────

export async function ingestSingle(
  apiKey: string,
  data: SensorDataIngest
): Promise<void> {
  await request<void>({
    method: "POST",
    path: "/api/v1/data/ingest",
    apiKey,
    body: data,
  });
}

export async function ingestBulk(
  apiKey: string,
  data: SensorDataBulk
): Promise<void> {
  await request<void>({
    method: "POST",
    path: "/api/v1/data/ingest/bulk",
    apiKey,
    body: data,
  });
}

// ─── Data Query (authenticated) ─────────────────────────────────────────────

export async function getLatestValues(
  token: string,
  deviceId: string
): Promise<SensorDataOut[]> {
  return request<SensorDataOut[]>({
    method: "GET",
    path: `/api/v1/data/${deviceId}/latest`,
    token,
  });
}

export async function getLatestEvents(
  token: string,
  limit = 20
): Promise<unknown> {
  return request({
    method: "GET",
    path: "/api/v1/data/latest-event",
    token,
    params: { limit },
  });
}

export async function getHistory(
  token: string,
  deviceId: string,
  opts?: { start?: string; end?: string; limit?: number }
): Promise<SensorDataOut[]> {
  return request<SensorDataOut[]>({
    method: "GET",
    path: `/api/v1/data/${deviceId}/history`,
    token,
    params: {
      start: opts?.start,
      end: opts?.end,
      limit: opts?.limit,
    },
  });
}

export async function getFieldStats(
  token: string,
  deviceId: string,
  hours = 24
): Promise<unknown> {
  return request({
    method: "GET",
    path: `/api/v1/data/${deviceId}/stats`,
    token,
    params: { hours },
  });
}

export async function getSlots(token: string): Promise<unknown> {
  return request({
    method: "GET",
    path: "/api/v1/data/slots",
    token,
  });
}

// ─── Health ─────────────────────────────────────────────────────────────────

export async function healthCheck(): Promise<unknown> {
  return request({
    method: "GET",
    path: "/health",
    timeoutMs: 5000,
  });
}
