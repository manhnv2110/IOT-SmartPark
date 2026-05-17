import { createServerFn } from "@tanstack/react-start";
import { DevicesResponseSchema, type Device } from "./parking.types";

const DEFAULT_URL = "https://795e-14-177-167-54.ngrok-free.app";
const DEFAULT_KEY = "abc";

/**
 * Server function: proxies the IoT parking API. Hides the apiKey and the
 * (often-changing) ngrok URL from the client. Override via env vars
 * PARKING_API_URL / PARKING_API_KEY when deploying.
 */
export const fetchDevices = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ devices: Device[]; error: string | null; fetchedAt: string }> => {
    const baseUrl = process.env.PARKING_API_URL || DEFAULT_URL;
    const apiKey = process.env.PARKING_API_KEY || DEFAULT_KEY;
    const url = `${baseUrl.replace(/\/$/, "")}/api/v1/devices/with-data`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, {
        method: "GET",
        headers: {
          accept: "application/json",
          apiKey,
          // Skip ngrok browser warning page
          "ngrok-skip-browser-warning": "true",
        },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return {
          devices: [],
          error: `Upstream ${res.status} ${res.statusText}: ${body.slice(0, 200)}`,
          fetchedAt: new Date().toISOString(),
        };
      }

      const json = await res.json();
      const parsed = DevicesResponseSchema.safeParse(json);
      if (!parsed.success) {
        return {
          devices: [],
          error: `Invalid response shape: ${parsed.error.message.slice(0, 200)}`,
          fetchedAt: new Date().toISOString(),
        };
      }

      return { devices: parsed.data, error: null, fetchedAt: new Date().toISOString() };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return {
        devices: [],
        error: `Failed to reach parking API: ${message}`,
        fetchedAt: new Date().toISOString(),
      };
    }
  }
);
