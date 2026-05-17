import { motion, AnimatePresence } from "framer-motion";
import { Car, Star } from "lucide-react";
import type { FloorLayout } from "@/lib/slot-layout";
import { cn } from "@/lib/utils";

interface Props {
  layout: FloorLayout;
  selectedSlotId?: string | null;
  onSelectSlot?: (slotId: string) => void;
  pathCells?: Array<[number, number]>;
}

export function SlotGrid2D({ layout, selectedSlotId, onSelectSlot, pathCells }: Props) {
  const pathSet = new Set((pathCells ?? []).map(([r, c]) => `${r},${c}`));

  return (
    <div className="rounded-2xl glass p-6 overflow-x-auto scrollbar-thin">
      <div className="flex gap-2 mb-4 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Legend color="var(--available)" label="Trống" />
        <Legend color="var(--occupied)" label="Đang dùng" />
        <Legend color="var(--reserved)" label="Đã chọn" />
        <Legend color="var(--primary)" label="Đường đi" />
      </div>

      <div className="flex">
        {/* Entry rail */}
        <div className="flex flex-col gap-1.5 mr-3">
          {Array.from({ length: layout.rows }).map((_, r) => (
            <div
              key={r}
              className={cn(
                "h-12 w-8 grid place-items-center text-[10px] rounded-md border border-dashed",
                pathSet.has(`${r},-1`)
                  ? "border-primary text-primary bg-primary/10"
                  : "border-border text-muted-foreground"
              )}
            >
              IN
            </div>
          ))}
        </div>

        <div
          className="grid gap-1.5"
          style={{
            gridTemplateColumns: `repeat(${layout.cols}, minmax(48px, 1fr))`,
            gridTemplateRows: `repeat(${layout.rows}, 48px)`,
          }}
        >
          {layout.slots.map((sp) => {
            const isPath = pathSet.has(`${sp.row},${sp.col}`);
            const isSelected = selectedSlotId === sp.slot.id;
            return (
              <motion.button
                key={sp.slot.id}
                layout
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() =>
                  !sp.slot.is_occupied && onSelectSlot?.(sp.slot.id)
                }
                disabled={sp.slot.is_occupied}
                title={`${sp.slot.slot_number} • ${sp.slot.is_occupied ? "Đang dùng" : "Trống"}`}
                style={{
                  gridRowStart: sp.row + 1,
                  gridColumnStart: sp.col + 1,
                }}
                className={cn(
                  "relative rounded-md text-[10px] font-mono font-semibold flex items-center justify-center transition-colors border",
                  sp.slot.is_occupied
                    ? "bg-[var(--occupied)]/15 text-[var(--occupied)] border-[var(--occupied)]/30 cursor-not-allowed"
                    : "bg-[var(--available)]/10 text-[var(--available)] border-[var(--available)]/30 hover:bg-[var(--available)]/25 cursor-pointer",
                  isSelected &&
                    "ring-2 ring-[var(--reserved)] bg-[var(--reserved)]/20 text-[var(--reserved)] border-[var(--reserved)]/50",
                  isPath && !isSelected && "ring-1 ring-primary/60"
                )}
              >
                <span>{sp.slot.slot_number}</span>
                <AnimatePresence>
                  {sp.slot.is_occupied && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 grid place-items-center"
                    >
                      <Car className="size-4 opacity-70" />
                    </motion.div>
                  )}
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute -top-1 -right-1"
                    >
                      <Star className="size-3 fill-[var(--reserved)] text-[var(--reserved)]" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="size-2.5 rounded-sm"
        style={{ background: color, opacity: 0.6 }}
      />
      {label}
    </span>
  );
}
