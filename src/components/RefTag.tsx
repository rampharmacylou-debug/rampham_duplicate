export default function RefTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded border border-hairline bg-white px-1.5 py-0.5 font-mono text-[0.7rem] text-muted">
      {children}
    </span>
  );
}
