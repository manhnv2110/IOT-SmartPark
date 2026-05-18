import type { SensorData } from "./parking.types";

export interface SlotPos {
  slot: SensorData;
  row: number; // 0..N
  col: number; // 0..M
}

export interface FloorLayout {
  floor: string;
  rows: number;
  cols: number;
  slots: SlotPos[];
}

/**
 * Parse slot_number like "A1", "A10", "B3" → row letter + col number.
 * Group by floor. Returns a layout per floor sorted by floor name.
 */
export function buildFloorLayouts(sensors: SensorData[]): FloorLayout[] {
  const byFloor = new Map<string, SensorData[]>();
  for (const s of sensors) {
    const arr = byFloor.get(s.floor) ?? [];
    arr.push(s);
    byFloor.set(s.floor, arr);
  }

  const layouts: FloorLayout[] = [];
  for (const [floor, list] of byFloor.entries()) {
    const parsed = list
      .map((s) => {
        const m = s.slot_number.match(/^([A-Za-z]+)(\d+)$/);
        const rowLetter = m ? m[1].toUpperCase() : "A";
        const colNum = m ? parseInt(m[2], 10) : 1;
        return { slot: s, rowLetter, colNum };
      })
      .sort((a, b) =>
        a.rowLetter === b.rowLetter
          ? a.colNum - b.colNum
          : a.rowLetter.localeCompare(b.rowLetter)
      );

    const rowLetters = Array.from(new Set(parsed.map((p) => p.rowLetter))).sort();
    const cols = parsed.reduce((m, p) => Math.max(m, p.colNum), 0);

    const slots: SlotPos[] = parsed.map((p) => ({
      slot: p.slot,
      row: rowLetters.indexOf(p.rowLetter),
      col: p.colNum - 1,
    }));

    layouts.push({ floor, rows: rowLetters.length, cols, slots });
  }
  layouts.sort((a, b) => a.floor.localeCompare(b.floor));
  return layouts;
}

/**
 * A* on the floor grid where occupied slots are obstacles for the path.
 * Entry is (row, -1). Returns sequence of [row, col] including target.
 */
export function findPath(
  layout: FloorLayout,
  target: SlotPos
): Array<[number, number]> {
  const { rows, cols } = layout;
  const blocked = new Set<string>();
  for (const sp of layout.slots) {
    if (sp.slot.is_occupied && !(sp.row === target.row && sp.col === target.col)) {
      blocked.add(`${sp.row},${sp.col}`);
    }
  }

  const start: [number, number] = [target.row, -1];
  const goal: [number, number] = [target.row, target.col];
  const key = (r: number, c: number) => `${r},${c}`;
  const h = (r: number, c: number) =>
    Math.abs(r - goal[0]) + Math.abs(c - goal[1]);

  const open: Array<{ pos: [number, number]; g: number; f: number }> = [
    { pos: start, g: 0, f: h(start[0], start[1]) },
  ];
  const came = new Map<string, [number, number]>();
  const gScore = new Map<string, number>();
  gScore.set(key(start[0], start[1]), 0);

  while (open.length > 0) {
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift()!;
    const [r, c] = cur.pos;
    if (r === goal[0] && c === goal[1]) {
      const path: Array<[number, number]> = [[r, c]];
      let k = key(r, c);
      while (came.has(k)) {
        const p = came.get(k)!;
        path.unshift(p);
        k = key(p[0], p[1]);
      }
      return path;
    }
    const neighbors: Array<[number, number]> = [
      [r + 1, c],
      [r - 1, c],
      [r, c + 1],
      [r, c - 1],
    ];
    for (const [nr, nc] of neighbors) {
      if (nr < 0 || nr >= rows) continue;
      if (nc < -1 || nc >= cols) continue;
      const nk = key(nr, nc);
      if (blocked.has(nk)) continue;
      const tentative = cur.g + 1;
      if (tentative < (gScore.get(nk) ?? Infinity)) {
        came.set(nk, [r, c]);
        gScore.set(nk, tentative);
        open.push({ pos: [nr, nc], g: tentative, f: tentative + h(nr, nc) });
      }
    }
  }
  return [];
}
