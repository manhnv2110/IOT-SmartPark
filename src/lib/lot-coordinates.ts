/**
 * Manual coordinates for known parking lots. Keys are matched against
 * device.name (case-insensitive). Edit this file to add real GPS positions
 * once known. Mock entries help showcase the map even when the API only
 * returns a single device.
 */
export interface LotCoord {
  lat: number;
  lng: number;
}

export const LOT_COORDINATES: Record<string, LotCoord> = {
  "bãi giữ xe số 1": { lat: 21.036, lng: 105.7615 },
  "bãi đỗ xe số 1": { lat: 21.036, lng: 105.7615 },
};

export function lookupCoord(name: string): LotCoord | null {
  const key = name.trim().toLowerCase();
  if (LOT_COORDINATES[key]) return LOT_COORDINATES[key];
  // fuzzy: contains
  for (const [k, v] of Object.entries(LOT_COORDINATES)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return null;
}

/**
 * Demo lots scattered around Hanoi so the map looks alive even when the API
 * is offline or only returns one device. Marked with isMock so we can render
 * them differently.
 */
export interface MockLot {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  total: number;
  available: number;
  isOnline: boolean;
}

export const MOCK_LOTS: MockLot[] = [
  {
    id: "mock-hoankiem",
    name: "Bãi đỗ Hoàn Kiếm",
    description: "Đinh Tiên Hoàng, Hoàn Kiếm, Hà Nội",
    lat: 21.0285,
    lng: 105.8542,
    total: 40,
    available: 12,
    isOnline: true,
  },
  {
    id: "mock-bahung",
    name: "Bãi đỗ Ba Đình",
    description: "Phố Ngọc Hà, Ba Đình, Hà Nội",
    lat: 21.0368,
    lng: 105.8342,
    total: 30,
    available: 3,
    isOnline: true,
  },
  {
    id: "mock-caugiay",
    name: "Bãi đỗ Cầu Giấy",
    description: "Trần Thái Tông, Cầu Giấy, Hà Nội",
    lat: 21.0322,
    lng: 105.7826,
    total: 60,
    available: 0,
    isOnline: true,
  },
  {
    id: "mock-thanhxuan",
    name: "Bãi đỗ Thanh Xuân",
    description: "Nguyễn Trãi, Thanh Xuân, Hà Nội",
    lat: 21.0034,
    lng: 105.8133,
    total: 50,
    available: 25,
    isOnline: true,
  },
  {
    id: "mock-haibatrung",
    name: "Bãi đỗ Hai Bà Trưng",
    description: "Phố Huế, Hai Bà Trưng, Hà Nội",
    lat: 21.0167,
    lng: 105.8504,
    total: 35,
    available: 8,
    isOnline: false,
  },
  {
    id: "mock-tayho",
    name: "Bãi đỗ Tây Hồ",
    description: "Xuân Diệu, Tây Hồ, Hà Nội",
    lat: 21.0664,
    lng: 105.8262,
    total: 45,
    available: 18,
    isOnline: true,
  },
  {
    id: "mock-longbien",
    name: "Bãi đỗ Long Biên",
    description: "Nguyễn Văn Cừ, Long Biên, Hà Nội",
    lat: 21.0393,
    lng: 105.8765,
    total: 55,
    available: 7,
    isOnline: true,
  },
];
