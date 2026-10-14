export function BrandMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="8" fill="#0d1a12" />
      <path d="M8 8h24v4H8z" fill="#d4b45a" />
      <path d="M10 14h6v18h-6z" fill="#f3efe4" />
      <path d="M18 14h12l-3 9 3 9H18z" fill="#d4b45a" />
    </svg>
  );
}
