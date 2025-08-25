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
        <div style={{ fontWeight: 600 }}>TideFly</div>
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
              background: "#e0f2fe",
              color: "#0ea5e9",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Get started
          </a>
        </div>
      </nav>
      <main
        style={{
          textAlign: "center",
          padding: "80px 16px",
          background: "linear-gradient(to bottom,#f0f9ff,#fff)",
        }}
      >
        <div
          style={{
            display: "inline-block",
            padding: "4px 12px",
            background: "#e0f2fe",
            color: "#0284c7",
            borderRadius: 9999,
            fontWeight: 500,
            marginBottom: 24,
          }}
        >
          Smart surf alerts for passionate surfers
        </div>
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
          your travel preferences. TideFly monitors global swell conditions so
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
              background: "#0ea5e9",
              color: "white",
              borderRadius: 8,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontWeight: 500,
            }}
          >
            Start tracking waves <span style={{ fontSize: 20 }}>→</span>
          </a>
          <a
            href="#"
            style={{
              padding: "12px 24px",
              border: "1px solid #0ea5e9",
              color: "#0ea5e9",
              borderRadius: 8,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontWeight: 500,
            }}
          >
            Watch demo <span style={{ fontSize: 20 }}>→</span>
          </a>
        </div>
        <div
          style={{
            maxWidth: 800,
            margin: "0 auto",
            aspectRatio: "16 / 9",
            background: "linear-gradient(to bottom right,#e0f2fe,#bae6fd)",
            borderRadius: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              background: "white",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#0ea5e9",
              fontSize: 32,
            }}
          >
            ▶
          </div>
        </div>
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
        <h2 style={{ textAlign: "center", fontSize: 32, marginBottom: 16 }}>
          Choose your wave hunting plan
        </h2>
        <p
          style={{
            textAlign: "center",
            maxWidth: 600,
            margin: "0 auto 40px",
            color: "#555",
          }}
        >
          From casual beach days to professional surf trips, we've got the
          perfect plan for every surfer.
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
            marginBottom: 40,
            fontWeight: 500,
          }}
        >
          <div
            style={{
              padding: "8px 16px",
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
            }}
          >
            Monthly
          </div>
          <div
            style={{
              padding: "8px 16px",
              background: "#3b82f6",
              color: "white",
              borderRadius: 8,
            }}
          >
            Yearly
            <span
              style={{
                marginLeft: 4,
                fontSize: 12,
                background: "#2563eb",
                padding: "2px 6px",
                borderRadius: 9999,
              }}
            >
              Save 17%
            </span>
          </div>
        </div>
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
              background: "white",
            }}
          >
            <h3 style={{ fontSize: 20, marginBottom: 8 }}>Wave Watcher</h3>
            <p style={{ color: "#555", marginBottom: 16 }}>
              For casual surfers
            </p>
            <p style={{ fontSize: 32, fontWeight: 700, marginBottom: 16 }}>
              $90<span style={{ fontSize: 16 }}>/yr</span>
            </p>
            <ul
              style={{
                textAlign: "left",
                color: "#555",
                listStyle: "disc",
                paddingLeft: 20,
                marginBottom: 24,
              }}
            >
              <li>Daily surf forecasts</li>
              <li>Email notifications</li>
              <li>3 favorite locations</li>
              <li>Community support</li>
            </ul>
            <a
              href="/auth"
              style={{
                display: "block",
                padding: "12px 24px",
                background: "#0ea5e9",
                color: "white",
                borderRadius: 8,
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Start watching
            </a>
          </div>
          <div
            style={{
              border: "2px solid #0ea5e9",
              borderRadius: 8,
              padding: 24,
              width: 280,
              textAlign: "center",
              background: "#f0f9ff",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -12,
                left: "50%",
                transform: "translateX(-50%)",
                background: "#0ea5e9",
                color: "white",
                padding: "4px 12px",
                borderRadius: 9999,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Most Popular
            </div>
            <h3 style={{ fontSize: 20, marginBottom: 8 }}>Surf Seeker</h3>
            <p style={{ color: "#555", marginBottom: 16 }}>
              For dedicated wave hunters
            </p>
            <p style={{ fontSize: 32, fontWeight: 700, marginBottom: 16 }}>
              $190<span style={{ fontSize: 16 }}>/yr</span>
            </p>
            <ul
              style={{
                textAlign: "left",
                color: "#555",
                listStyle: "disc",
                paddingLeft: 20,
                marginBottom: 24,
              }}
            >
              <li>Unlimited surf spots</li>
              <li>Advanced wind alerts</li>
              <li>SMS + email notifications</li>
              <li>15-day swell forecasts</li>
              <li>Trip planning tools</li>
            </ul>
            <a
              href="/auth"
              style={{
                display: "block",
                padding: "12px 24px",
                background: "#0ea5e9",
                color: "white",
                borderRadius: 8,
                textDecoration: "none",
                fontWeight: 600,
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
              background: "white",
            }}
          >
            <h3 style={{ fontSize: 20, marginBottom: 8 }}>Pro Rider</h3>
            <p style={{ color: "#555", marginBottom: 16 }}>
              For surf pros chasing swells
            </p>
            <p style={{ fontSize: 32, fontWeight: 700, marginBottom: 16 }}>
              $390<span style={{ fontSize: 16 }}>/yr</span>
            </p>
            <ul
              style={{
                textAlign: "left",
                color: "#555",
                listStyle: "disc",
                paddingLeft: 20,
                marginBottom: 24,
              }}
            >
              <li>Everything in Surf Seeker</li>
              <li>Global spot monitoring</li>
              <li>AI swell predictions</li>
              <li>Historical data analytics</li>
              <li>1-on-1 pro coaching</li>
            </ul>
            <a
              href="/auth"
              style={{
                display: "block",
                padding: "12px 24px",
                background: "#0ea5e9",
                color: "white",
                borderRadius: 8,
                textDecoration: "none",
                fontWeight: 600,
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
