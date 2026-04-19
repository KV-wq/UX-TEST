"use client";

export default function AppSplash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-4">
      <div className="text-center">
        <div className="text-lg font-semibold tracking-tight">
          <span className="gradient-accent-text">TEST</span>{" "}
          <span className="text-ink">UX</span>
        </div>
        <div className="mx-auto mt-5 h-1 w-28 rounded-full bg-white/10">
          <div className="h-full animate-pulse rounded-full bg-accent/50" />
        </div>
      </div>
    </div>
  );
}
