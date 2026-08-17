"use client";

// Catches errors thrown by the root layout itself. It replaces the whole
// document, so it must render <html>/<body> and can't rely on the app's CSS.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          background: "#0D0D0D",
          color: "#fff",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          textAlign: "center",
          padding: "0 24px",
        }}
      >
        <h1 style={{ fontSize: "22px", fontWeight: 800 }}>Something went wrong</h1>
        <p style={{ maxWidth: "24rem", fontSize: "14px", color: "#a1a1a1" }}>
          We hit an unexpected error. Please try again.
        </p>
        <button
          onClick={reset}
          style={{
            background: "#CCFF30",
            color: "#0D0D0D",
            border: "none",
            borderRadius: "16px",
            padding: "12px 20px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
        {error.digest && (
          <p style={{ fontSize: "12px", color: "#6b6b6b" }}>Reference: {error.digest}</p>
        )}
      </body>
    </html>
  );
}
