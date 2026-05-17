/**
 * Color legend overlay for the map. Uses semantic tokens to match pin
 * colors used in ParkingMap.
 */
export function MapLegend() {
  const items = [
    { color: "oklch(0.62 0.2 250)", label: "Vị trí của bạn" },
    { color: "oklch(0.65 0.18 155)", label: "Còn nhiều chỗ" },
    { color: "oklch(0.72 0.17 70)", label: "Sắp đầy" },
    { color: "oklch(0.62 0.22 25)", label: "Hết chỗ" },
    { color: "oklch(0.62 0.02 250)", label: "Offline" },
  ];
  return (
    <div className="glass rounded-xl p-2.5 text-[11px] space-y-1.5">
      <div className="font-semibold text-foreground/80 px-1 mb-1">Chú thích</div>
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-2 px-1">
          <span
            className="size-3 rounded-full ring-2 ring-white/80"
            style={{ background: it.color }}
          />
          <span className="text-muted-foreground">{it.label}</span>
        </div>
      ))}
    </div>
  );
}
