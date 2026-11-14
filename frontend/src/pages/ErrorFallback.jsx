import { useRouteError } from "react-router-dom";

export default function ErrorFallback() {
  const error = useRouteError();
  console.error(error);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-black px-6 text-center text-white">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="max-w-sm text-sm text-zinc-400">An unexpected error occurred. Try reloading the page.</p>
      <button
        onClick={() => window.location.reload()}
        className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
      >
        Reload
      </button>
    </div>
  );
}
