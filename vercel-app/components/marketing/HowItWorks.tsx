export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 bg-sky-50">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center">How it works</h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-3 text-center">
          <div>
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-white font-bold">
              1
            </span>
            <h3 className="mt-4 font-semibold">Set your spots</h3>
            <p className="mt-2 text-slate-600">
              Choose favorite breaks and travel preferences.
            </p>
          </div>
          <div>
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-white font-bold">
              2
            </span>
            <h3 className="mt-4 font-semibold">We monitor conditions</h3>
            <p className="mt-2 text-slate-600">
              Our engine watches global swells 24/7.
            </p>
          </div>
          <div>
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-white font-bold">
              3
            </span>
            <h3 className="mt-4 font-semibold">Catch perfect waves</h3>
            <p className="mt-2 text-slate-600">
              Get instant alerts when it's time to paddle out.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
