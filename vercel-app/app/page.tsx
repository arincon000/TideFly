export default function LandingPage() {
  return (
    <div>
      {/* Navigation */}
      <nav className="flex justify-between items-center px-8 py-5 text-sm">
        <div className="text-lg font-semibold">TideFly</div>
        <div className="hidden md:flex gap-8">
          <a href="#features" className="hover:text-sky-600">Features</a>
          <a href="#pricing" className="hover:text-sky-600">Pricing</a>
          <a href="#how" className="hover:text-sky-600">How it works</a>
        </div>
        <div className="flex gap-4 items-center">
          <a href="/auth" className="hover:underline">
            Sign in
          </a>
          <a
            href="/auth"
            className="px-4 py-2 rounded-md bg-sky-500 text-white font-medium hover:bg-sky-600"
          >
            Get started
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-sky-50 via-white to-sky-100">
        <div className="max-w-5xl mx-auto text-center px-6 py-24">
          <span className="inline-block mb-6 px-4 py-1 rounded-full bg-sky-100 text-sky-700 text-sm font-medium">
            Smart surf alerts for passionate surfers
          </span>
          <h1 className="text-5xl sm:text-6xl font-extrabold mb-6">
            Never miss the perfect
            <span className="bg-gradient-to-r from-sky-400 to-indigo-600 bg-clip-text text-transparent">
              {" "}wave again
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-sky-900/70 mb-10">
            Get intelligent surf alerts based on wave height, wind conditions, and your travel preferences. TideFly monitors global swell conditions so you know when epic sessions await.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="/auth"
              className="px-6 py-3 rounded-lg bg-sky-500 text-white font-medium shadow hover:bg-sky-600"
            >
              Start tracking waves
            </a>
            <a
              href="#"
              className="px-6 py-3 rounded-lg border border-sky-500 text-sky-600 font-medium hover:bg-sky-50"
            >
              Watch demo
            </a>
          </div>
          <div className="mt-16 mx-auto max-w-3xl aspect-video rounded-xl bg-gradient-to-br from-sky-100 to-sky-200 flex items-center justify-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-sky-500 text-3xl">
              ▶
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Stay ahead of the swell</h2>
          <p className="max-w-2xl mx-auto text-gray-600 mb-12">
            Intelligent swell alerts, travel-friendly recommendations and more to keep you on top of the waves.
          </p>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="p-8 rounded-2xl border border-gray-200 hover:shadow-md transition flex flex-col items-center text-center">
              <div className="w-14 h-14 mb-4 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-2xl">🌊</div>
              <h3 className="font-semibold mb-2">Real-time alerts</h3>
              <p className="text-gray-600 text-sm">
                Get notified the moment your favorite spots start firing.
              </p>
            </div>
            <div className="p-8 rounded-2xl border border-gray-200 hover:shadow-md transition flex flex-col items-center text-center">
              <div className="w-14 h-14 mb-4 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-2xl">📍</div>
              <h3 className="font-semibold mb-2">Travel friendly</h3>
              <p className="text-gray-600 text-sm">
                Filter alerts by distance so you can chase swells on the go.
              </p>
            </div>
            <div className="p-8 rounded-2xl border border-gray-200 hover:shadow-md transition flex flex-col items-center text-center">
              <div className="w-14 h-14 mb-4 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-2xl">⚡</div>
              <h3 className="font-semibold mb-2">Fast setup</h3>
              <p className="text-gray-600 text-sm">
                Create your profile and start receiving alerts in minutes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24 px-6 bg-sky-50">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-12">How it works</h2>
          <div className="grid md:grid-cols-3 gap-12">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 mb-4 rounded-full bg-sky-500 text-white flex items-center justify-center font-semibold">
                1
              </div>
              <h3 className="font-medium mb-2">Set your spots</h3>
              <p className="text-gray-600 text-sm">Choose favorite breaks and travel preferences.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 mb-4 rounded-full bg-sky-500 text-white flex items-center justify-center font-semibold">
                2
              </div>
              <h3 className="font-medium mb-2">We monitor conditions</h3>
              <p className="text-gray-600 text-sm">Our engine watches global swells 24/7.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 mb-4 rounded-full bg-sky-500 text-white flex items-center justify-center font-semibold">
                3
              </div>
              <h3 className="font-medium mb-2">Catch perfect waves</h3>
              <p className="text-gray-600 text-sm">Get instant alerts when it’s time to paddle out.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Choose your wave hunting plan</h2>
          <p className="max-w-2xl mx-auto text-gray-600 mb-10">
            From casual beach days to professional surf trips, we've got the perfect plan for every surfer.
          </p>
          <div className="inline-flex mb-12 rounded-full overflow-hidden border border-sky-200">
            <button className="px-4 py-2 text-sm font-medium bg-white">Monthly</button>
            <button className="px-4 py-2 text-sm font-medium bg-sky-600 text-white">Yearly</button>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="rounded-2xl border border-gray-200 p-8 flex flex-col">
              <h3 className="text-xl font-semibold mb-2">Beach Bum</h3>
              <p className="text-gray-600 mb-6">Up to 2 alerts</p>
              <ul className="mb-6 list-disc list-inside text-left text-gray-600 space-y-1 flex-1">
                <li>Bullet point</li>
                <li>Bullet point</li>
                <li>Bullet point</li>
              </ul>
              <button className="w-full mt-auto py-3 rounded-lg bg-gray-100 font-medium hover:bg-gray-200">
                Choose plan
              </button>
            </div>
            <div className="relative rounded-2xl border border-sky-500 p-8 flex flex-col bg-gradient-to-b from-sky-50 to-white">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs rounded-full bg-sky-500 text-white">Most Popular</span>
              <h3 className="text-xl font-semibold mb-2">Surf Seeker</h3>
              <p className="text-gray-600 mb-6">Unlimited alerts</p>
              <ul className="mb-6 list-disc list-inside text-left text-gray-600 space-y-1 flex-1">
                <li>Bullet point</li>
                <li>Bullet point</li>
                <li>Bullet point</li>
              </ul>
              <button className="w-full mt-auto py-3 rounded-lg bg-sky-500 text-white font-medium hover:bg-sky-600">
                Choose plan
              </button>
            </div>
            <div className="rounded-2xl border border-gray-200 p-8 flex flex-col">
              <h3 className="text-xl font-semibold mb-2">Pro Rider</h3>
              <p className="text-gray-600 mb-6">Advanced analytics</p>
              <ul className="mb-6 list-disc list-inside text-left text-gray-600 space-y-1 flex-1">
                <li>Bullet point</li>
                <li>Bullet point</li>
                <li>Bullet point</li>
              </ul>
              <button className="w-full mt-auto py-3 rounded-lg bg-gray-100 font-medium hover:bg-gray-200">
                Choose plan
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
