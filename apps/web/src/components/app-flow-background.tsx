"use client";

/**
 * Site-wide Three.js flow threads — fixed behind all pages (full viewport).
 * Loaded client-only; respects prefers-reduced-motion inside FlowFieldScene.
 */
import dynamic from "next/dynamic";

const FlowFieldScene = dynamic(
  () => import("@xauconnect/ui/three").then((m) => m.FlowFieldScene),
  { ssr: false, loading: () => null },
);

export function AppFlowBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 h-[100dvh] w-screen overflow-hidden"
      aria-hidden
    >
      <FlowFieldScene className="h-full w-full" />
    </div>
  );
}
