import Link from "next/link";
import { Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Hero() {
  return (
    <section className="py-24 text-center">
      <div className="max-w-6xl mx-auto px-6">
        <Badge className="bg-sky-100 text-sky-600">
          Smart surf alerts for passionate surfers
        </Badge>
        <h1 className="mt-6 text-5xl font-extrabold tracking-tight">
          Never miss the perfect {" "}
          <span className="bg-gradient-to-r from-sky-500 to-indigo-500 bg-clip-text text-transparent">
            wave
          </span>{" "}
          again
        </h1>
        <p className="mt-6 text-lg text-slate-600">
          Get intelligent surf alerts based on wave height, wind conditions, and
          your travel preferences. TideFly monitors global swell conditions so
          you know when epic sessions await.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/auth">
            <Button>Start tracking waves</Button>
          </Link>
          <Button variant="outline" aria-label="Watch demo">
            <Play className="mr-2 h-4 w-4" /> Watch demo
          </Button>
        </div>
        <div className="mt-12 mx-auto aspect-video w-full max-w-3xl rounded-lg bg-slate-200 flex items-center justify-center">
          <Play className="h-12 w-12 text-slate-500" />
        </div>
      </div>
    </section>
  );
}
