"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en-NG">
      <body style={{ fontFamily: "system-ui", display: "grid", placeItems: "center", minHeight: "100vh", background: "#faf8f4", color: "#0f1113" }}>
        <div style={{ textAlign: "center" }}>
          <h1>We&apos;re having trouble right now</h1>
          <p>Please try again in a moment.</p>
          <button onClick={reset} style={{ padding: "10px 20px", background: "#0f1113", color: "#faf8f4", border: 0 }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
