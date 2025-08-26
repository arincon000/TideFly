import { Card } from "@/components/ui/card";
import { Waves, MapPin, Zap } from "lucide-react";

export default function Features() {
  return (
    <section id="features" className="py-20">
      <div className="max-w-6xl mx-auto px-6 text-center">
        <h2 className="text-3xl font-bold">Stay ahead of the swell</h2>
        <p className="mt-4 text-lg text-slate-600">
          Intelligent swell alerts, travel-friendly recommendations and more to
          keep you on top of the waves.
        </p>
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <Waves className="h-10 w-10 text-sky-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Real-time alerts</h3>
            <p className="text-slate-600">
              Get notified the moment your favorite spots start firing.
            </p>
          </Card>
          <Card>
            <MapPin className="h-10 w-10 text-sky-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Travel friendly</h3>
            <p className="text-slate-600">
              Filter alerts by distance so you can chase swells on the go.
            </p>
          </Card>
          <Card>
            <Zap className="h-10 w-10 text-sky-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Fast setup</h3>
            <p className="text-slate-600">
              Create your profile and start receiving alerts in minutes.
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
}
