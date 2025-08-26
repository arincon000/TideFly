"use client";

import { useState } from "react";

export default function LandingPage() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  return (
    <div>
      <nav>
        <div>TideFly</div>
        <div>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#how">How it works</a>
        </div>
        <div>
          <a href="/auth?view=sign_in">Sign in</a>
          <a href="/auth?view=sign_up">Start tracking waves</a>
        </div>
      </nav>
      <main>
        <h1>Never miss the perfect wave again</h1>
        <p>
          Get intelligent surf alerts based on wave height, wind conditions,
          and your travel preferences. Tidefly monitors global swell
          conditions so you know when epic sessions await.
        </p>
        <div>
          <a href="/auth?view=sign_up">Start tracking waves</a>
          <a href="#">Watch demo</a>
        </div>
      </main>
      <section id="features">
        <h2>Stay ahead of the swell</h2>
        <p>
          Intelligent swell alerts, travel-friendly recommendations and more
          to keep you on top of the waves.
        </p>
        <div>
          <div>
            <h3>Real-time alerts</h3>
            <p>Get notified the moment your favorite spots start firing.</p>
          </div>
          <div>
            <h3>Travel friendly</h3>
            <p>Filter alerts by distance so you can chase swell on the go.</p>
          </div>
          <div>
            <h3>Fast setup</h3>
            <p>Create your profile and start receiving alerts in minutes.</p>
          </div>
        </div>
      </section>
      <section id="how">
        <h2>How it works</h2>
        <p>
          Set your preferred spots and travel filters, then let TideFly alert
          you when conditions line up.
        </p>
        <div>
          <div>
            <div>1</div>
            <h3>Set your spots</h3>
            <p>Choose favorite breaks and travel preferences.</p>
          </div>
          <div>
            <div>2</div>
            <h3>We monitor conditions</h3>
            <p>Our engine watches global swells 24/7.</p>
          </div>
          <div>
            <div>3</div>
            <h3>Catch perfect waves</h3>
            <p>Get instant alerts when it's time to paddle out.</p>
          </div>
        </div>
      </section>
      <section id="pricing">
        <h2>Choose your wave hunting plan</h2>
        <div>
          <button onClick={() => setBilling("monthly")}>Monthly</button>
          <button onClick={() => setBilling("yearly")}>Yearly</button>
        </div>
        <div>
          <div>
            <h3>Beach Bum</h3>
            <p>Up to 2 alerts</p>
            <p>
              ${billing === "monthly" ? "0" : "0"}/{billing === "monthly" ? "mo" : "yr"}
            </p>
            <ul>
              <li>Bullet point</li>
              <li>Bullet point</li>
              <li>Bullet point</li>
            </ul>
            <a href="/auth?view=sign_up">Choose plan</a>
          </div>
          <div>
            <h3>Surf Seeker</h3>
            <p>Unlimited alerts</p>
            <p>
              ${billing === "monthly" ? "19" : "190"}/{billing === "monthly" ? "mo" : "yr"}
            </p>
            <ul>
              <li>Bullet point</li>
              <li>Bullet point</li>
              <li>Bullet point</li>
            </ul>
            <a href="/auth?view=sign_up">Choose plan</a>
          </div>
          <div>
            <h3>Pro Rider</h3>
            <p>Advanced analytics</p>
            <p>
              ${billing === "monthly" ? "39" : "390"}/{billing === "monthly" ? "mo" : "yr"}
            </p>
            <ul>
              <li>Bullet point</li>
              <li>Bullet point</li>
              <li>Bullet point</li>
            </ul>
            <a href="/auth?view=sign_up">Choose plan</a>
          </div>
        </div>
      </section>
    </div>
  );
}

