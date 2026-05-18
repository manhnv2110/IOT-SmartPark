/**
 * IoT API module — public barrel file.
 *
 * Usage from server functions:
 *   import { iotClient, IoT } from "@/lib/iot-api";
 *   const devices = await iotClient.listDevicesWithData();
 *
 * Types:
 *   import type { IoT } from "@/lib/iot-api";
 *   const device: IoT.DeviceOut = ...;
 */

export * as iotClient from "./client";
export * as IoT from "./types";
export {
  DevicesWithDataResponseSchema,
  DeviceWithDataOutSchema,
  SensorDataOutSchema,
  DeviceOutSchema,
  LockCommandSchema,
} from "./types";
export { buildMockDevices, shouldForceMock } from "./mock-devices";
