"use client";

import { useState } from "react";
import { Bell, Plane, Zap, Play } from "lucide-react";

export default function LandingPage() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  return (
    <div>
      <nav className="flex items-center justify-between px-8 py-4">
        <div className="font-bold text-blue-500">TideFly</div>
        <div className="flex gap-6">
          <a href="#features" className="hover:text-blue-500">
            Features
          </a>
          <a href="#pricing" className="hover:text-blue-500">
            Pricing
          </a>
          <a href="#how" className="hover:text-blue-500">
            How it works
          </a>
        </div>
        <div className="flex gap-4">
          <a href="/auth?view=sign_in" className="hover:text-blue-500">
            Sign in
          </a>
          <a
            href="/auth?view=sign_up"
            className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            Get started
          </a>
        </div>
      </nav>

      <main className="relative bg-gradient-to-br from-sky-100 to-white px-4 py-20 text-center">
        <h1 className="mb-4 text-5xl font-bold">
          Never miss the perfect
          <span className="bg-gradient-to-r from-sky-400 to-blue-600 bg-clip-text text-transparent">
            {" "}wave again
          </span>
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-600">
          Get intelligent surf alerts based on wave height, wind conditions,
          and your travel preferences. Tidefly monitors global swell
          conditions so you know when epic sessions await.
        </p>
        <div className="mb-10 flex justify-center gap-4">
          <a
            href="/auth?view=sign_up"
            className="rounded-md bg-blue-500 px-6 py-3 text-white hover:bg-blue-600"
          >
            Start tracking waves
          </a>
          <a
            href="#"
            className="rounded-md border border-blue-500 px-6 py-3 text-blue-500 hover:bg-blue-50"
          >
            Watch demo
          </a>
        </div>
        <div className="mx-auto flex aspect-video max-w-3xl items-center justify-center rounded-lg bg-blue-100">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow">
            <Play className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <svg viewBox="0 0 1440 320" className="absolute bottom-0 left-0 w-full">
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
        <h2 className="mb-6 text-center text-3xl font-semibold">
          Stay ahead of the swell
        </h2>
        <p className="mx-auto mb-10 max-w-2xl text-center text-gray-600">
          Intelligent swell alerts, travel-friendly recommendations and more to
          keep you on top of the waves.
        </p>
        <div className="flex flex-wrap justify-center gap-8">
          <div className="w-72 text-center">
            <Bell className="mx-auto h-10 w-10 text-blue-500" />
            <h3 className="mb-2 mt-4 text-xl font-medium">Real-time alerts</h3>
            <p className="text-gray-600">
              Get notified the moment your favorite spots start firing.
            </p>
          </div>
          <div className="w-72 text-center">
            <Plane className="mx-auto h-10 w-10 text-blue-500" />
            <h3 className="mb-2 mt-4 text-xl font-medium">Travel friendly</h3>
            <p className="text-gray-600">
              Filter alerts by distance so you can chase swells on the go.
            </p>
          </div>
          <div className="w-72 text-center">
            <Zap className="mx-auto h-10 w-10 text-blue-500" />
            <h3 className="mb-2 mt-4 text-xl font-medium">Fast setup</h3>
            <p className="text-gray-600">
              Create your profile and start receiving alerts in minutes.
            </p>
          </div>
        </div>
      </section>

      <section id="how" className="bg-slate-50 px-4 py-20">
        <h2 className="mb-6 text-center text-3xl font-semibold">How it works</h2>
        <p className="mx-auto mb-10 max-w-2xl text-center text-gray-600">
          Set your preferred spots and travel filters, then let TideFly alert you
          when conditions line up.
        </p>
        <div className="flex flex-wrap justify-center gap-8">
          <div className="w-64 text-center">
            <div className="mb-2 text-3xl font-semibold text-blue-500">1</div>
            <h3 className="mb-2 text-xl font-medium">Set your spots</h3>
            <p className="text-gray-600">
              Choose favorite breaks and travel preferences.
            </p>
          </div>
          <div className="w-64 text-center">
            <div className="mb-2 text-3xl font-semibold text-blue-500">2</div>
            <h3 className="mb-2 text-xl font-medium">We monitor conditions</h3>
            <p className="text-gray-600">Our engine watches global swells 24/7.</p>
          </div>
          <div className="w-64 text-center">
            <div className="mb-2 text-3xl font-semibold text-blue-500">3</div>
            <h3 className="mb-2 text-xl font-medium">Catch perfect waves</h3>
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
        <h2 className="mb-6 text-center text-3xl font-semibold">
          Choose your wave hunting plan
        </h2>
        <div className="mb-10 flex justify-center gap-2">
          <button
            onClick={() => setBilling("monthly")}
            className={`rounded-md px-4 py-2 ${
              billing === "monthly"
                ? "border border-blue-500 bg-blue-500 text-white"
                : "border border-gray-300"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("yearly")}
            className={`rounded-md px-4 py-2 ${
              billing === "yearly"
                ? "border border-blue-500 bg-blue-500 text-white"
                : "border border-gray-300"
            }`}
          >
            Yearly
          </button>
        </div>
        <div className="flex flex-wrap justify-center gap-8">
          <div className="w-72 rounded-lg border border-gray-200 p-6 text-center">
            <h3 className="mb-2 text-xl font-medium">Beach Bum</h3>
            <p className="mb-4">Up to 2 alerts</p>
            <p className="mb-4 text-2xl font-semibold">
              {billing === "monthly" ? "$0" : "$0"}
              <span className="text-base font-normal">
                /{billing === "monthly" ? "mo" : "yr"}
              </span>
            </p>
            <ul className="mb-4 list-disc pl-5 text-left text-gray-600">
              <li>Bullet point</li>
              <li>Bullet point</li>
              <li>Bullet point</li>
            </ul>
            <a
              href="/auth?view=sign_up"
              className="inline-block rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              Choose plan
            </a>
          </div>
          <div className="relative w-72 rounded-lg border-2 border-blue-500 p-6 text-center">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-md bg-blue-500 px-2 py-1 text-xs text-white">
              Most Popular
            </div>
            <h3 className="mb-2 text-xl font-medium">Surf Seeker</h3>
            <p className="mb-4">Unlimited alerts</p>
            <p className="mb-4 text-2xl font-semibold">
              {billing === "monthly" ? "$19" : "$190"}
              <span className="text-base font-normal">
                /{billing === "monthly" ? "mo" : "yr"}
              </span>
            </p>
            <ul className="mb-4 list-disc pl-5 text-left text-gray-600">
              <li>Bullet point</li>
              <li>Bullet point</li>
              <li>Bullet point</li>
            </ul>
            <a
              href="/auth?view=sign_up"
              className="inline-block rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              Choose plan
            </a>
          </div>
          <div className="w-72 rounded-lg border border-gray-200 p-6 text-center">
            <h3 className="mb-2 text-xl font-medium">Pro Rider</h3>
            <p className="mb-4">Advanced analytics</p>
            <p className="mb-4 text-2xl font-semibold">
              {billing === "monthly" ? "$39" : "$390"}
              <span className="text-base font-normal">
                /{billing === "monthly" ? "mo" : "yr"}
              </span>
            </p>
            <ul className="mb-4 list-disc pl-5 text-left text-gray-600">
              <li>Bullet point</li>
              <li>Bullet point</li>
              <li>Bullet point</li>
            </ul>
            <a
              href="/auth?view=sign_up"
              className="inline-block rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              Choose plan
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

