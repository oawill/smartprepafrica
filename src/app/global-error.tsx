"use client"; // Error boundaries must be Client Components

// global-error replaces the root layout when active, so it must define its
// own <html>/<body> and can't rely on the root layout's fonts or providers —
// kept deliberately minimal for that reason.
export default function GlobalError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ background: "#020617", color: "#f1f5f9", fontFamily: "sans-serif" }}>
        <main
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "1rem",
          }}
        >
          <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "#f87171" }}>500</p>
          <h1 style={{ marginTop: "0.5rem", fontSize: "1.5rem", fontWeight: 600 }}>
            Something went wrong
          </h1>
          <p style={{ marginTop: "0.5rem", maxWidth: 420, fontSize: "0.875rem", color: "#94a3b8" }}>
            Educom hit an unexpected error. Please try again.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: "2rem",
              borderRadius: 9999,
              background: "#f97316",
              color: "#020617",
              fontWeight: 500,
              fontSize: "0.875rem",
              padding: "0.625rem 1.5rem",
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
