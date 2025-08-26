"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Check } from "lucide-react";

const tiers = [
  {
    name: "Beach Bum",
    description: "Up to 2 alerts",
    price: { monthly: 5, yearly: 50 },
    features: ["2 favorite spots", "Email alerts", "Basic swell charts"],
  },
  {
    name: "Surf Seeker",
    description: "Unlimited alerts",
    price: { monthly: 15, yearly: 150 },
    features: [
      "Unlimited spots",
      "SMS & email",
      "Custom travel radius",
    ],
    mostPopular: true,
  },
  {
    name: "Pro Rider",
    description: "Advanced analytics",
    price: { monthly: 29, yearly: 290 },
    features: [
      "Advanced analytics",
      "Multi-spot dashboards",
      "Priority support",
    ],
  },
];

export default function Pricing() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  return (
    <section id="pricing" className="py-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Choose your wave hunting plan</h2>
          <p className="mt-4 text-lg text-slate-600">
            From casual beach days to professional surf trips, we’ve got the
            perfect plan for every surfer.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <span className="text-sm font-medium">Monthly</span>
            <Switch
              checked={billing === "yearly"}
              onCheckedChange={(c) => setBilling(c ? "yearly" : "monthly")}
            />
            <span className="text-sm font-medium">Yearly</span>
          </div>
        </div>
        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          {tiers.map((tier) => (
            <Card key={tier.name} className="relative flex flex-col">
              {tier.mostPopular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sky-500 text-white">
                  Most Popular
                </Badge>
              )}
              <h3 className="text-xl font-semibold text-center">{tier.name}</h3>
              <p className="mt-2 text-center text-slate-600">{tier.description}</p>
              <div className="mt-4 text-center">
                <span className="text-4xl font-bold">
                  ${tier.price[billing]}
                </span>
                <span className="text-slate-600">
                  {billing === "monthly" ? "/mo" : "/yr"}
                </span>
              </div>
              <ul className="mt-6 space-y-2 text-sm flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-sky-500" />
                    <span className="text-slate-600">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button className="mt-6">Choose plan</Button>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
