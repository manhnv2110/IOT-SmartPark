import { z } from "zod";

// ─── Auth ───────────────────────────────────────────────────────────────────

export const UserCreateSchema = z.object({
  email: z.string().email(),
  username: z.string(),
  password: z.string(),
});
export type UserCreate = z.infer<typeof UserCreateSchema>;

export const UserLoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});
export type UserLogin = z.infer<typeof UserLoginSchema>;

export const UserOutSchema = z.object({
  id: z.string(),
  email: z.string(),
  username: z.string(),
  is_admin: z.boolean(),
  created_at: z.string(),
});
export type UserOut = z.infer<typeof UserOutSchema>;

export const TokenSchema = z.object({
  access_token: z.string(),
  token_type: z.string().default("bearer"),
  user: UserOutSchema,
});
export type Token = z.infer<typeof TokenSchema>;

// ─── Devices ────────────────────────────────────────────────────────────────

export const DeviceCreateSchema = z.object({
  name: z.string(),
  description: z.string().default(""),
  device_type: z.string().default("generic"),
  meta: z.record(z.string(), z.any()).default({}),
});
export type DeviceCreate = z.infer<typeof DeviceCreateSchema>;

export const DeviceUpdateSchema = z.object({
  name: z.string().nullish(),
  description: z.string().nullish(),
  device_type: z.string().nullish(),
  is_active: z.boolean().nullish(),
  meta: z.record(z.string(), z.any()).nullish(),
});
export type DeviceUpdate = z.infer<typeof DeviceUpdateSchema>;

export const DeviceOutSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  device_type: z.string(),
  api_key: z.string(),
  mqtt_topic: z.string(),
  is_active: z.boolean(),
  is_online: z.boolean(),
  last_seen: z.string().nullable(),
  meta: z.record(z.string(), z.any()),
  created_at: z.string(),
  updated_at: z.string(),
});
export type DeviceOut = z.infer<typeof DeviceOutSchema>;

// ─── Sensor Data ────────────────────────────────────────────────────────────

export const SensorDataIngestSchema = z.object({
  floor: z.string(),
  slot_number: z.string().optional(),
  is_occupied: z.boolean().nullish(),
  type: z.string().nullish(),
  locked: z.boolean().nullish(),
});
export type SensorDataIngest = z.infer<typeof SensorDataIngestSchema>;

export const SensorDataBulkSchema = z.object({
  readings: z.array(SensorDataIngestSchema),
});
export type SensorDataBulk = z.infer<typeof SensorDataBulkSchema>;

export const SensorDataOutSchema = z.object({
  id: z.string(),
  device_id: z.string(),
  floor: z.string(),
  slot_number: z.string(),
  is_occupied: z.boolean().nullable(),
  type: z.string().nullable(),
  timestamp: z.string(),
  locked: z.boolean().nullable(),
});
export type SensorDataOut = z.infer<typeof SensorDataOutSchema>;

// ─── Device With Data (public endpoint) ─────────────────────────────────────

export const DeviceWithDataOutSchema = z.object({
  name: z.string(),
  description: z.string(),
  is_online: z.boolean(),
  last_seen: z.string().nullable(),
  meta: z.record(z.string(), z.any()).nullable().default({}),
  updated_at: z.string(),
  sensor_data: z.array(SensorDataOutSchema).default([]),
});
export type DeviceWithDataOut = z.infer<typeof DeviceWithDataOutSchema>;

export const DevicesWithDataResponseSchema = z.array(DeviceWithDataOutSchema);

// ─── Lock Command ───────────────────────────────────────────────────────────

export const LockCommandSchema = z.object({
  slot_number: z.string(),
  locked: z.boolean(),
});
export type LockCommand = z.infer<typeof LockCommandSchema>;
