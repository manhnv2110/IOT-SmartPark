import { createFileRoute } from "@tanstack/react-router";

/**
 * Healthcheck endpoint — trả `{ ok, sha, ts }` để:
 * - `useServerTime` đo offset client/server.
 * - Smoke test deploy (Cloudflare Workers).
 *
 * Không phụ thuộc DB hay auth → luôn trả 200 nhanh.
 */
export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: () => {
        const sha =
          (typeof process !== "undefined" && process.env?.GIT_SHA) ||
          (typeof process !== "undefined" && process.env?.VITE_GIT_SHA) ||
          "dev";
        return Response.json(
          {
            ok: true,
            sha,
            ts: new Date().toISOString(),
          },
          {
            headers: {
              "cache-control": "no-store",
            },
          },
        );
      },
    },
  },
});
