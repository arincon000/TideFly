export default function LandingPage() {
  return (
    <div>
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 32px",
        }}
      >
        <div style={{ fontWeight: 700, color: "#3b82f6" }}>TideFly</div>
        <div style={{ display: "flex", gap: 24 }}>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#how">How it works</a>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <a href="/auth" style={{ textDecoration: "none" }}>
            Sign in
          </a>
          <a
            href="/auth"
            style={{
              padding: "8px 16px",
              background: "#3b82f6",
              color: "white",
              borderRadius: 8,
              textDecoration: "none",
            }}
          >
            Start tracking waves
          </a>
        </div>
      </nav>
      <main style={{ textAlign: "center", padding: "60px 16px" }}>
        <h1 style={{ fontSize: 48, marginBottom: 16 }}>
          Never miss the perfect
          <span
            style={{
              background: "linear-gradient(to right,#38bdf8,#2563eb)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            {" "}wave again
          </span>
        </h1>
        <p
          style={{
            maxWidth: 600,
            margin: "0 auto 32px",
            color: "#555",
            fontSize: 18,
          }}
        >
          Get intelligent surf alerts based on wave height, wind conditions, and
          your travel preferences. Tidefly monitors global swell conditions so
          you know when epic sessions await.
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 16,
            marginBottom: 40,
          }}
        >
          <a
            href="/auth"
            style={{
              padding: "12px 24px",
              background: "#3b82f6",
              color: "white",
              borderRadius: 8,
              textDecoration: "none",
            }}
          >
            Start tracking waves
          </a>
          <a
            href="#"
            style={{
              padding: "12px 24px",
              border: "1px solid #3b82f6",
              color: "#3b82f6",
              borderRadius: 8,
              textDecoration: "none",
            }}
          >
            Watch demo
          </a>
        </div>
        <div
          style={{
            maxWidth: 800,
            margin: "0 auto",
            aspectRatio: "16 / 9",
            background: "#000",
            borderRadius: 8,
          }}
        ></div>
      </main>
      <section id="features" style={{ padding: "80px 16px" }}>
        <h2 style={{ textAlign: "center", fontSize: 32, marginBottom: 24 }}>
          Features
        </h2>
        <p style={{ textAlign: "center", maxWidth: 600, margin: "0 auto" }}>
          Intelligent swell alerts, travel-friendly recommendations and more to
          keep you on top of the waves.
        </p>
      </section>
      <section id="how" style={{ padding: "80px 16px", background: "#f0f2f4" }}>
        <h2 style={{ textAlign: "center", fontSize: 32, marginBottom: 24 }}>
          How it works
        </h2>
        <p style={{ textAlign: "center", maxWidth: 600, margin: "0 auto" }}>
          Set your preferred spots and travel filters, then let TideFly alert you
          when conditions line up.
        </p>
      </section>
      <section
        id="pricing"
        style={{ padding: "80px 16px", background: "#f9fafb" }}
      >
        <h2 style={{ textAlign: "center", fontSize: 32, marginBottom: 40 }}>
          Choose your wave hunting plan
        </h2>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: 24,
              width: 280,
              textAlign: "center",
            }}
          >
            <h3 style={{ fontSize: 20, marginBottom: 8 }}>Wave Watcher</h3>
            <p style={{ marginBottom: 16 }}>Casual beach days</p>
            <p style={{ fontSize: 24, fontWeight: 600 }}>
              $0<span style={{ fontSize: 16 }}>/mo</span>
            </p>
            <a
              href="/auth"
              style={{
                marginTop: 16,
                display: "inline-block",
                padding: "8px 16px",
                background: "#3b82f6",
                color: "white",
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              Start watching
            </a>
          </div>
          <div
            style={{
              border: "2px solid #3b82f6",
              borderRadius: 8,
              padding: 24,
              width: 280,
              textAlign: "center",
            }}
          >
            <h3 style={{ fontSize: 20, marginBottom: 8 }}>Surf Seeker</h3>
            <p style={{ marginBottom: 16 }}>Find better waves</p>
            <p style={{ fontSize: 24, fontWeight: 600 }}>
              $19<span style={{ fontSize: 16 }}>/mo</span>
            </p>
            <a
              href="/auth"
              style={{
                marginTop: 16,
                display: "inline-block",
                padding: "8px 16px",
                background: "#3b82f6",
                color: "white",
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              Start seeking
            </a>
          </div>
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: 24,
              width: 280,
              textAlign: "center",
            }}
          >
            <h3 style={{ fontSize: 20, marginBottom: 8 }}>Pro Rider</h3>
            <p style={{ marginBottom: 16 }}>Chase the best swells</p>
            <p style={{ fontSize: 24, fontWeight: 600 }}>
              $39<span style={{ fontSize: 16 }}>/mo</span>
            </p>
            <a
              href="/auth"
              style={{
                marginTop: 16,
                display: "inline-block",
                padding: "8px 16px",
                background: "#3b82f6",
                color: "white",
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              Go pro
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
