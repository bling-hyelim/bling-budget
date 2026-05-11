export default function Loading() {
  return (
    <div className="px-4 pt-6 space-y-4 animate-pulse">
      <div className="h-9 w-32 rounded-xl bg-[var(--surface-soft)]" />
      <div className="h-24 rounded-3xl bg-[var(--surface-soft)]" />
      <div className="space-y-2">
        <div className="h-12 rounded-2xl bg-[var(--surface-soft)]" />
        <div className="h-12 rounded-2xl bg-[var(--surface-soft)]" />
        <div className="h-12 rounded-2xl bg-[var(--surface-soft)]" />
      </div>
    </div>
  );
}
