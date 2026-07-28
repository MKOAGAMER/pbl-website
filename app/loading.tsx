export default function Loading() {
  return (
    <div className="site-shell animate-pulse py-14 sm:py-20" aria-label="Loading page">
      <div className="h-3 w-32 rounded-full bg-[var(--surface-soft)]" />
      <div className="mt-6 h-16 max-w-3xl rounded-2xl bg-[var(--surface)] sm:h-24" />
      <div className="mt-5 h-5 max-w-xl rounded-full bg-[var(--surface)]" />
      <div className="mt-12 grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-56 rounded-[1.5rem] bg-[var(--surface)]" />)}
      </div>
    </div>
  );
}

