import { AppScreen } from "./layouts";

export function LoadingSpinner({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <div
      className={[
        "animate-spin rounded-full border-2 border-warm-coral border-t-transparent",
        className,
      ].join(" ")}
    />
  );
}

export default function LoadingPage({ message = "Loading..." }: { message?: string }) {
  return (
    <AppScreen padContent={false} className="grid place-items-center">
      <div className="flex flex-col items-center gap-3 text-warm-brown/70">
        <LoadingSpinner className="w-10 h-10 border-4" />
        {message ? <span className="text-sm">{message}</span> : null}
      </div>
    </AppScreen>
  );
}
