export default function LandingPage() {
  return (
    <div>
      <nav className="flex justify-between items-center px-8 py-4">
        <div className="font-semibold">TideFly</div>
        <div className="flex gap-6">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#how">How it works</a>
        </div>
        <div className="flex gap-4">
          <a href="/auth" className="hover:underline">Sign in</a>
          <a
            href="/auth"
            className="px-4 py-2 bg-sky-100 text-sky-600 rounded-md font-medium"
          >
            Get started
          </a>
        </div>
      </nav>
      <main className="text-center py-20 px-4 bg-gradient-to-b from-sky-50 to-white">
        <div className="inline-block px-3 py-1 bg-sky-100 text-sky-600 rounded-full font-medium mb-6">
          Smart surf alerts for passionate surfers
        </div>
        <h1 className="text-5xl font-bold mb-4">
          Never miss the perfect {" "}
          <span className="bg-gradient-to-r from-sky-400 to-indigo-600 bg-clip-text text-transparent">
            wave again
          </span>
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-gray-600 mb-8">
          Get intelligent surf alerts based on wave height, wind conditions, and your travel preferences. TideFly monitors global swell conditions so you know when epic sessions await.
        </p>
        <div className="flex justify-center gap-4 mb-10">
          <a
            href="/auth"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-sky-500 text-white font-medium"
          >
            Start tracking waves <span className="text-xl">→</span>
          </a>
          <a
            href="#"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md border border-sky-500 text-sky-500 font-medium"
          >
            Watch demo <span className="text-xl">→</span>
          </a>
        </div>
        <div className="mx-auto max-w-3xl aspect-video rounded-xl bg-gradient-to-br from-sky-100 to-sky-200 flex items-center justify-center">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-sky-500 text-3xl">
            ▶
          </div>
        </div>
      </main>
      <section id="features" className="py-20 px-4">
        <h2 className="text-3xl font-semibold text-center mb-6">Features</h2>
        <p className="text-center max-w-2xl mx-auto">
          Intelligent swell alerts, travel-friendly recommendations and more to keep you on top of the waves.
        </p>
      </section>
      <section id="how" className="py-20 px-4 bg-gray-100">
        <h2 className="text-3xl font-semibold text-center mb-6">How it works</h2>
        <p className="text-center max-w-2xl mx-auto">
          Set your preferred spots and travel filters, then let TideFly alert you when conditions line up.
        </p>
      </section>
      <section id="pricing" className="py-20 px-4 bg-gray-50">
        <h2 className="text-3xl font-semibold text-center mb-4">
          Choose your wave hunting plan
        </h2>
        <p className="text-center max-w-2xl mx-auto text-gray-600 mb-10">
          From casual beach days to professional surf trips, we've got the perfect plan for every surfer.
        </p>
        <div className="flex justify-center gap-2 mb-10 font-medium">
          <div className="px-4 py-2 bg-white border border-gray-200 rounded-l-md">Monthly</div>
          <div className="px-4 py-2 bg-gray-100 border border-gray-200 rounded-r-md">Yearly</div>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className="rounded-lg border border-gray-200 p-6 flex flex-col">
            <h3 className="text-lg font-semibold mb-2">Beach Bum</h3>
            <p className="text-gray-600 mb-4">Up to 2 alerts</p>
            <div className="mt-auto">
              <button className="w-full mt-4 px-4 py-2 bg-gray-100 rounded-md font-medium">
                Choose plan
              </button>
            </div>
          </div>
          <div className="rounded-lg border border-sky-500 p-6 flex flex-col relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sky-500 text-white text-xs px-2 py-1 rounded-full">Most Popular</span>
            <h3 className="text-lg font-semibold mb-2">Surf Seeker</h3>
            <p className="text-gray-600 mb-4">Unlimited alerts</p>
            <div className="mt-auto">
              <button className="w-full mt-4 px-4 py-2 bg-sky-500 text-white rounded-md font-medium">
                Choose plan
              </button>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-6 flex flex-col">
            <h3 className="text-lg font-semibold mb-2">Pro Rider</h3>
            <p className="text-gray-600 mb-4">Advanced analytics</p>
            <div className="mt-auto">
              <button className="w-full mt-4 px-4 py-2 bg-gray-100 rounded-md font-medium">
                Choose plan
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
