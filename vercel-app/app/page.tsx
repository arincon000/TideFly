"use client";

import { useState } from "react";
import { Bell, Plane, Zap } from "lucide-react";

export default function LandingPage() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

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
          Stay ahead of the swell
        </h2>
        <p
          style={{
            textAlign: "center",
            maxWidth: 600,
            margin: "0 auto 40px",
            color: "#555",
          }}
        >
          Intelligent swell alerts, travel-friendly recommendations and more to
          keep you on top of the waves.
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div style={{ width: 280, textAlign: "center" }}>
            <Bell size={40} color="#3b82f6" />
            <h3 style={{ fontSize: 20, marginBottom: 8 }}>Real-time alerts</h3>
            <p style={{ color: "#555" }}>
              Get notified the moment your favorite spots start firing.
            </p>
          </div>
          <div style={{ width: 280, textAlign: "center" }}>
            <Plane size={40} color="#3b82f6" />
            <h3 style={{ fontSize: 20, marginBottom: 8 }}>Travel friendly</h3>
            <p style={{ color: "#555" }}>
              Filter alerts by distance so you can chase swell on the go.
            </p>
          </div>
          <div style={{ width: 280, textAlign: "center" }}>
            <Zap size={40} color="#3b82f6" />
            <h3 style={{ fontSize: 20, marginBottom: 8 }}>Fast setup</h3>
            <p style={{ color: "#555" }}>
              Create your profile and start receiving alerts in minutes.
            </p>
          </div>
        </div>
      </section>
      <section id="how" style={{ padding: "80px 16px", background: "#f0f2f4" }}>
        <h2 style={{ textAlign: "center", fontSize: 32, marginBottom: 24 }}>
          How it works
        </h2>
        <p
          style={{ textAlign: "center", maxWidth: 600, margin: "0 auto 40px", color: "#555" }}
        >
          Set your preferred spots and travel filters, then let TideFly alert you
          when conditions line up.
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div style={{ width: 260, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>1</div>
            <h3 style={{ fontSize: 20, marginBottom: 8 }}>Set your spots</h3>
            <p style={{ color: "#555" }}>
              Choose favorite breaks and travel preferences.
            </p>
          </div>
          <div style={{ width: 260, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>2</div>
            <h3 style={{ fontSize: 20, marginBottom: 8 }}>We monitor conditions</h3>
            <p style={{ color: "#555" }}>
              Our engine watches global swells 24/7.
            </p>
          </div>
          <div style={{ width: 260, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>3</div>
            <h3 style={{ fontSize: 20, marginBottom: 8 }}>Catch perfect waves</h3>
            <p style={{ color: "#555" }}>
              Get instant alerts when it's time to paddle out.
            </p>
          </div>
        </div>
      </section>
      <section
        id="pricing"
        style={{ padding: "80px 16px", background: "#f9fafb" }}
      >
        <h2 style={{ textAlign: "center", fontSize: 32, marginBottom: 24 }}>
          Choose your wave hunting plan
        </h2>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
            marginBottom: 40,
          }}
        >
          <button
            onClick={() => setBilling("monthly")}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border:
                billing === "monthly" ? "1px solid #3b82f6" : "1px solid #e5e7eb",
              background: billing === "monthly" ? "#3b82f6" : "white",
              color: billing === "monthly" ? "white" : "#333",
            }}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("yearly")}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border:
                billing === "yearly" ? "1px solid #3b82f6" : "1px solid #e5e7eb",
              background: billing === "yearly" ? "#3b82f6" : "white",
              color: billing === "yearly" ? "white" : "#333",
            }}
          >
            Yearly
          </button>
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
            }}
          >
            <h3 style={{ fontSize: 20, marginBottom: 8 }}>Beach Bum</h3>
            <p style={{ marginBottom: 16 }}>Up to 2 alerts</p>
            <p style={{ fontSize: 24, fontWeight: 600 }}>
              ${billing === "monthly" ? "0" : "0"}
              <span style={{ fontSize: 16 }}>
                /{billing === "monthly" ? "mo" : "yr"}
              </span>
            </p>
            <ul
              style={{
                textAlign: "left",
                listStyle: "disc",
                paddingLeft: 20,
                color: "#555",
              }}
            >
              <li>Bullet point</li>
              <li>Bullet point</li>
              <li>Bullet point</li>
            </ul>
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
              Choose plan
            </a>
          </div>
          <div
            style={{
              position: "relative",
              border: "2px solid #3b82f6",
              borderRadius: 8,
              padding: 24,
              width: 280,
              textAlign: "center",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -16,
                left: "50%",
                transform: "translateX(-50%)",
                background: "#3b82f6",
                color: "white",
                padding: "2px 8px",
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              Most Popular
            </div>
            <h3 style={{ fontSize: 20, marginBottom: 8 }}>Surf Seeker</h3>
            <p style={{ marginBottom: 16 }}>Unlimited alerts</p>
            <p style={{ fontSize: 24, fontWeight: 600 }}>
              ${billing === "monthly" ? "19" : "190"}
              <span style={{ fontSize: 16 }}>
                /{billing === "monthly" ? "mo" : "yr"}
              </span>
            </p>
            <ul
              style={{
                textAlign: "left",
                listStyle: "disc",
                paddingLeft: 20,
                color: "#555",
              }}
            >
              <li>Bullet point</li>
              <li>Bullet point</li>
              <li>Bullet point</li>
            </ul>
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
              Choose plan
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
            <p style={{ marginBottom: 16 }}>Advanced analytics</p>
            <p style={{ fontSize: 24, fontWeight: 600 }}>
              ${billing === "monthly" ? "39" : "390"}
              <span style={{ fontSize: 16 }}>
                /{billing === "monthly" ? "mo" : "yr"}
              </span>
            </p>
            <ul
              style={{
                textAlign: "left",
                listStyle: "disc",
                paddingLeft: 20,
                color: "#555",
              }}
            >
              <li>Bullet point</li>
              <li>Bullet point</li>
              <li>Bullet point</li>
            </ul>
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
              Choose plan
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
