import { createFileRoute, Link } from "@tanstack/react-router";
import { useFavorites } from "@/hooks/useFavorites";
import { useParkingDevices } from "@/hooks/useParkingDevices";
import { getDeviceId } from "@/lib/parking.types";
import { LotCard } from "@/components/parking/LotCard";
import { Star, Compass } from "lucide-react";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";

export const Route = createFileRoute("/favorites")({
  head: () => ({
    meta: [{ title: "Yêu thích — SmartPark" }],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { favs } = useFavorites();
  const { data } = useParkingDevices();
  const devices = (data?.devices ?? []).filter((d) => favs.includes(getDeviceId(d)));

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Cá nhân"
        title="Bãi đỗ yêu thích"
        description={`${favs.length} bãi đã được ghim — truy cập nhanh khi bạn cần.`}
      />

      {devices.length === 0 ? (
        <EmptyState
          icon={Star}
          title="Chưa có bãi yêu thích nào"
          description="Bấm biểu tượng ngôi sao trên một bãi để ghim ở đây và truy cập nhanh hơn."
          action={
            <Link
              to="/lots"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Compass className="size-4" /> Khám phá bãi đỗ
            </Link>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((d) => (
            <LotCard key={getDeviceId(d)} device={d} />
          ))}
        </div>
      )}
    </div>
  );
}
