export function BrandMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="8" fill="#0a0a0a" stroke="#f7f7f7" strokeWidth="1.5" />
      <path d="M8 8h24v3H8z" fill="#f7f7f7" />
      <path d="M10 13h5v19h-5z" fill="#f7f7f7" />
      <path d="M17 13h13l-3.5 9.5 3.5 9.5H17z" fill="#2e2e2e" />
    </svg>
  );
}
