import { APP_STORE_URL } from "./config";

/**
 * Apple "Download on the App Store" badge, rebuilt as crisp inline SVG/markup
 * so it stays sharp at any size and needs no image asset.
 */
export function AppStoreButton({
  className = "",
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  const pad = size === "sm" ? "px-4 py-2.5" : "px-5 py-3";
  return (
    <a
      href={APP_STORE_URL}
      className={`inline-flex items-center gap-2.5 rounded-2xl bg-white text-black transition-transform hover:-translate-y-0.5 hover:bg-white/90 ${pad} ${className}`}
    >
      <svg viewBox="0 0 24 24" className={size === "sm" ? "h-5 w-5" : "h-6 w-6"} fill="currentColor" aria-hidden>
        <path d="M17.05 12.53c-.02-2.02 1.65-2.99 1.72-3.04-.94-1.37-2.4-1.56-2.92-1.58-1.24-.13-2.42.73-3.05.73-.63 0-1.6-.71-2.63-.69-1.35.02-2.6.79-3.29 2-1.4 2.43-.36 6.03 1 8 .67.96 1.47 2.04 2.51 2 1.01-.04 1.39-.65 2.61-.65 1.22 0 1.56.65 2.63.63 1.09-.02 1.78-.98 2.44-1.95.77-1.12 1.09-2.2 1.11-2.26-.02-.01-2.13-.82-2.15-3.25zM15.03 6.3c.56-.68.94-1.62.83-2.56-.81.03-1.79.54-2.37 1.21-.52.6-.98 1.56-.86 2.48.9.07 1.83-.46 2.4-1.13z" />
      </svg>
      <span className="text-left leading-none">
        <span className="block text-[10px] font-medium opacity-70">Download on the</span>
        <span className="block text-[15px] font-bold leading-tight">App Store</span>
      </span>
    </a>
  );
}
