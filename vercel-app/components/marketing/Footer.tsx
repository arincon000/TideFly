export default function Footer() {
  return (
    <footer className="py-10 border-t border-slate-200/60 text-sm text-slate-600">
      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between gap-4">
        <div>© TideFly {new Date().getFullYear()}.</div>
        <div className="flex gap-4">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Contact</a>
        </div>
      </div>
    </footer>
  );
}
