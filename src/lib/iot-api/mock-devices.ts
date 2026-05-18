/**
 * Mock IoT data — dùng khi:
 *   - IOT_USE_MOCK=1 (ép buộc, dev/local)
 *   - Hoặc IoT API thật fail (tự động fallback để vẫn đặt chỗ + test thanh toán được)
 *
 * Format khớp đúng schema `DeviceWithDataOut` (xem types.ts).
 *
 * Đặc điểm để test:
 *   - 4 bãi với device_id ổn định (UUID v4 hardcode) → URL booking/new?lot=<id> stable.
 *   - 1 bãi offline (Hai Bà Trưng) để test filter "Online".
 *   - Slots phân bố trên 1–2 tầng, slot_number theo pattern A1..A10 / B1..B10.
 *   - Mỗi lần render hash khác nhau (occupancy thay đổi nhẹ theo phút) → useParkingDevices
 *     vẫn nhận diện "có thay đổi" để giữ poll FAST khi dev.
 */

import type { DeviceWithDataOut, SensorDataOut } from "./types";

interface MockSlotSpec {
  floor: string;
  slot: string;
  occupiedHash: number; // 0..99 — slot là occupied nếu (epochMin + occupiedHash) % SOMETHING == 0
}

interface MockDeviceSpec {
  /** UUID v4 stable — dùng làm device_id của tất cả sensor */
  deviceId: string;
  name: string;
  description: string;
  isOnline: boolean;
  /** Toạ độ để map có pin (lookupCoord match theo name) */
  meta?: Record<string, unknown>;
  slots: MockSlotSpec[];
}

/** Sinh slot list pattern: floor "1": A1..A10, B1..B10 */
function genSlots(
  floors: { floor: string; rows: string[]; cols: number }[],
): MockSlotSpec[] {
  const out: MockSlotSpec[] = [];
  let h = 0;
  for (const f of floors) {
    for (const row of f.rows) {
      for (let c = 1; c <= f.cols; c++) {
        out.push({
          floor: f.floor,
          slot: `${row}${c}`,
          occupiedHash: (h * 31 + 7) % 100,
        });
        h++;
      }
    }
  }
  return out;
}

const MOCK_DEVICES: MockDeviceSpec[] = [
  {
    deviceId: "11111111-1111-4111-8111-111111111111",
    name: "Bãi đỗ Hoàn Kiếm",
    description: "Đinh Tiên Hoàng, Hoàn Kiếm, Hà Nội",
    isOnline: true,
    meta: { lat: 21.0285, lng: 105.8542, capacity: 40 },
    slots: genSlots([{ floor: "1", rows: ["A", "B"], cols: 10 }]),
  },
  {
    deviceId: "22222222-2222-4222-8222-222222222222",
    name: "Bãi đỗ Cầu Giấy",
    description: "Trần Thái Tông, Cầu Giấy, Hà Nội",
    isOnline: true,
    meta: { lat: 21.0322, lng: 105.7826, capacity: 60 },
    slots: genSlots([
      { floor: "1", rows: ["A", "B"], cols: 10 },
      { floor: "2", rows: ["A", "B"], cols: 10 },
    ]),
  },
  {
    deviceId: "33333333-3333-4333-8333-333333333333",
    name: "Bãi đỗ Tây Hồ",
    description: "Xuân Diệu, Tây Hồ, Hà Nội",
    isOnline: true,
    meta: { lat: 21.0664, lng: 105.8262, capacity: 30 },
    slots: genSlots([{ floor: "1", rows: ["A", "B", "C"], cols: 10 }]),
  },
  {
    deviceId: "44444444-4444-4444-8444-444444444444",
    name: "Bãi đỗ Hai Bà Trưng",
    description: "Phố Huế, Hai Bà Trưng, Hà Nội",
    isOnline: false,
    meta: { lat: 21.0167, lng: 105.8504, capacity: 20 },
    slots: genSlots([{ floor: "1", rows: ["A", "B"], cols: 10 }]),
  },
];

/**
 * Trả mock devices với occupancy thay đổi mỗi phút (deterministic theo wall-clock
 * → SSR/CSR hydrate khớp trong cùng 1 phút).
 */
export function buildMockDevices(now: Date = new Date()): DeviceWithDataOut[] {
  const epochMin = Math.floor(now.getTime() / 60_000);
  const ts = now.toISOString();

  return MOCK_DEVICES.map<DeviceWithDataOut>((spec) => {
    const sensors: SensorDataOut[] = spec.slots.map((s, i) => ({
      id: `${spec.deviceId}:${s.floor}:${s.slot}`,
      device_id: spec.deviceId,
      floor: s.floor,
      slot_number: s.slot,
      // Mix: ~40% occupied, dao động theo phút để feel realtime
      is_occupied: ((epochMin + s.occupiedHash) % 5) < 2,
      type: i % 7 === 0 ? "motorbike" : "car",
      timestamp: ts,
      locked: false,
    }));

    return {
      name: spec.name,
      description: spec.description,
      is_online: spec.isOnline,
      // Bãi offline → last_seen 30 phút trước
      last_seen: spec.isOnline
        ? ts
        : new Date(now.getTime() - 30 * 60_000).toISOString(),
      meta: spec.meta ?? {},
      updated_at: ts,
      sensor_data: sensors,
    };
  });
}

/** True nếu nên dùng mock — ép buộc qua env IOT_USE_MOCK=1. */
export function shouldForceMock(): boolean {
  const v = process.env.IOT_USE_MOCK;
  return v === "1" || v === "true";
}
