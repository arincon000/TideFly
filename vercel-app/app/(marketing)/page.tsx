export default function Landing() {
  return (
    <main className="px-6 py-12">
      <h1 className="text-4xl font-extrabold">
        Never miss the perfect <span className="text-blue-600">wave</span> again
      </h1>
      <p className="mt-4 max-w-xl">
        Smart surf alerts based on wave height, wind and your travel settings.
      </p>
      <div className="mt-6 flex gap-3">
        <a href="/signin" className="px-4 py-2 rounded bg-blue-600 text-white">Start tracking waves</a>
        <a href="#pricing" className="px-4 py-2 rounded border">View pricing</a>
      </div>
      {/* Leave pretty styling for later. Keep it simple so nothing breaks. */}
    </main>
  );
}
