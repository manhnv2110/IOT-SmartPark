import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * Banner cố định khi `navigator.onLine === false`.
 *
 * Khi mất mạng, banner hiển thị + phát aria-live polite.
 * Mutation buttons trong app nên check `useOnline()` để disable thêm — nhưng
 * MVP chỉ ghi banner, không tự disable mọi nút.
 */
function getInitial(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

export function useOnline(): boolean {
  const [online, setOnline] = useState<boolean>(getInitial);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onUp = () => setOnline(true);
    const onDown = () => setOnline(false);
    window.addEventListener("online", onUp);
    window.addEventListener("offline", onDown);
    return () => {
      window.removeEventListener("online", onUp);
      window.removeEventListener("offline", onDown);
    };
  }, []);

  return online;
}

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-[60] bg-destructive text-destructive-foreground"
    >
      <div className="mx-auto max-w-7xl px-4 py-2 flex items-center gap-2 text-sm font-medium">
        <WifiOff className="size-4" aria-hidden="true" />
        <span>Bạn đang offline. Một số thao tác có thể không hoạt động.</span>
      </div>
    </div>
  );
}
