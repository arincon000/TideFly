"use client";

import { useState } from "react";
import { Bell, Plane, Zap } from "lucide-react";

export default function LandingPage() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  return (
    <div className="flex min-h-screen flex-col">
      <nav className="flex items-center justify-between px-8 py-4">
        <div className="text-2xl font-bold text-blue-500">TideFly</div>
        <div className="hidden gap-8 md:flex">
          <a href="#features" className="text-gray-700 hover:text-blue-500">
            Features
          </a>
          <a href="#pricing" className="text-gray-700 hover:text-blue-500">
            Pricing
          </a>
          <a href="#how" className="text-gray-700 hover:text-blue-500">
            How it works
          </a>
        </div>
        <div className="flex gap-4">
          <a
            href="/auth"
            className="text-sm font-medium text-gray-700 hover:text-blue-500"
          >
            Sign in
          </a>
          <a
            href="/auth"
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
          >
            Start tracking waves
          </a>
        </div>
      </nav>
      <main className="relative bg-gradient-to-br from-sky-100 to-white px-4 py-20 text-center">
        <h1 className="mx-auto mb-4 max-w-3xl text-5xl font-bold tracking-tight">
          Never miss the perfect{" "}
          <span className="bg-gradient-to-r from-sky-400 to-blue-600 bg-clip-text text-transparent">
            wave again
          </span>
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-600">
          Get intelligent surf alerts based on wave height, wind conditions, and
          your travel preferences. Tidefly monitors global swell conditions so
          you know when epic sessions await.
        </p>
        <div className="mb-10 flex justify-center gap-4">
          <a
            href="/auth"
            className="rounded-lg bg-blue-500 px-6 py-3 font-medium text-white hover:bg-blue-600"
          >
            Start tracking waves
          </a>
          <a
            href="#"
            className="rounded-lg border border-blue-500 px-6 py-3 font-medium text-blue-500 hover:bg-blue-50"
          >
            Watch demo
          </a>
        </div>
        <div className="mx-auto h-64 max-w-4xl rounded-lg bg-black"></div>
        <svg
          viewBox="0 0 1440 320"
          className="absolute bottom-0 left-0 w-full"
        >
          <path
            fill="#ffffff"
            d="M0,160L60,181.3C120,203,240,245,360,234.7C480,224,600,160,720,128C840,96,960,96,1080,106.7C1200,117,1320,139,1380,149.3L1440,160L1440,0L1380,0C1320,0,1200,0,1080,0C960,0,840,0,720,0C600,0,480,0,360,0C240,0,120,0,60,0L0,0Z"
          ></path>
        </svg>
      </main>
      <section
        id="features"
        className="bg-gradient-to-b from-white to-sky-50 px-4 py-20"
      >
        <h2 className="mb-6 text-center text-3xl font-bold">
          Stay ahead of the swell
        </h2>
        <p className="mx-auto mb-10 max-w-2xl text-center text-gray-600">
          Intelligent swell alerts, travel-friendly recommendations and more to
          keep you on top of the waves.
        </p>
        <div className="flex flex-wrap justify-center gap-10">
          <div className="w-64 text-center">
            <Bell size={40} className="mx-auto mb-4 text-blue-500" />
            <h3 className="mb-2 text-xl font-semibold">Real-time alerts</h3>
            <p className="text-gray-600">
              Get notified the moment your favorite spots start firing.
            </p>
          </div>
          <div className="w-64 text-center">
            <Plane size={40} className="mx-auto mb-4 text-blue-500" />
            <h3 className="mb-2 text-xl font-semibold">Travel friendly</h3>
            <p className="text-gray-600">
              Filter alerts by distance so you can chase swell on the go.
            </p>
          </div>
          <div className="w-64 text-center">
            <Zap size={40} className="mx-auto mb-4 text-blue-500" />
            <h3 className="mb-2 text-xl font-semibold">Fast setup</h3>
            <p className="text-gray-600">
              Create your profile and start receiving alerts in minutes.
            </p>
          </div>
        </div>
      </section>
      <section id="how" className="bg-gray-50 px-4 py-20">
        <h2 className="mb-6 text-center text-3xl font-bold">How it works</h2>
        <p className="mx-auto mb-10 max-w-2xl text-center text-gray-600">
          Set your preferred spots and travel filters, then let TideFly alert you
          when conditions line up.
        </p>
        <div className="flex flex-wrap justify-center gap-10">
          <div className="w-64 text-center">
            <div className="mx-auto mb-2 text-3xl font-bold text-blue-500">1</div>
            <h3 className="mb-2 text-xl font-semibold">Set your spots</h3>
            <p className="text-gray-600">
              Choose favorite breaks and travel preferences.
            </p>
          </div>
          <div className="w-64 text-center">
            <div className="mx-auto mb-2 text-3xl font-bold text-blue-500">2</div>
            <h3 className="mb-2 text-xl font-semibold">We monitor conditions</h3>
            <p className="text-gray-600">Our engine watches global swells 24/7.</p>
          </div>
          <div className="w-64 text-center">
            <div className="mx-auto mb-2 text-3xl font-bold text-blue-500">3</div>
            <h3 className="mb-2 text-xl font-semibold">Catch perfect waves</h3>
            <p className="text-gray-600">
              Get instant alerts when it's time to paddle out.
            </p>
          </div>
        </div>
      </section>
      <section
        id="pricing"
        className="bg-gradient-to-t from-sky-100 to-white px-4 py-20"
      >
        <h2 className="mb-6 text-center text-3xl font-bold">
          Choose your wave hunting plan
        </h2>
        <div className="mb-10 flex justify-center gap-4">
          <button
            onClick={() => setBilling("monthly")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${billing === "monthly" ? "bg-blue-500 text-white" : "border border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-500"}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("yearly")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${billing === "yearly" ? "bg-blue-500 text-white" : "border border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-500"}`}
          >
            Yearly
          </button>
        </div>
        <div className="flex flex-wrap justify-center gap-10">
          <div className="w-72 rounded-lg border border-gray-200 p-6 text-center">
            <h3 className="mb-2 text-xl font-semibold">Beach Bum</h3>
            <p className="mb-4">Up to 2 alerts</p>
            <p className="mb-4 text-3xl font-bold">
              ${billing === "monthly" ? "0" : "0"}
              <span className="text-base font-medium">
                /{billing === "monthly" ? "mo" : "yr"}
              </span>
            </p>
            <ul className="mb-6 list-disc space-y-1 text-left text-sm text-gray-600">
              <li>Bullet point</li>
              <li>Bullet point</li>
              <li>Bullet point</li>
            </ul>
            <a
              href="/auth"
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
            >
              Choose plan
            </a>
          </div>
          <div className="relative w-72 rounded-lg border-2 border-blue-500 p-6 text-center">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded bg-blue-500 px-2 py-1 text-xs font-medium text-white">
              Most Popular
            </div>
            <h3 className="mb-2 text-xl font-semibold">Surf Seeker</h3>
            <p className="mb-4">Unlimited alerts</p>
            <p className="mb-4 text-3xl font-bold">
              ${billing === "monthly" ? "19" : "190"}
              <span className="text-base font-medium">
                /{billing === "monthly" ? "mo" : "yr"}
              </span>
            </p>
            <ul className="mb-6 list-disc space-y-1 text-left text-sm text-gray-600">
              <li>Bullet point</li>
              <li>Bullet point</li>
              <li>Bullet point</li>
            </ul>
            <a
              href="/auth"
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
            >
              Choose plan
            </a>
          </div>
          <div className="w-72 rounded-lg border border-gray-200 p-6 text-center">
            <h3 className="mb-2 text-xl font-semibold">Pro Rider</h3>
            <p className="mb-4">Advanced analytics</p>
            <p className="mb-4 text-3xl font-bold">
              ${billing === "monthly" ? "39" : "390"}
              <span className="text-base font-medium">
                /{billing === "monthly" ? "mo" : "yr"}
              </span>
            </p>
            <ul className="mb-6 list-disc space-y-1 text-left text-sm text-gray-600">
              <li>Bullet point</li>
              <li>Bullet point</li>
              <li>Bullet point</li>
            </ul>
            <a
              href="/auth"
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
            >
              Choose plan
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

