import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

const fieldClass =
  "w-full rounded-md border border-line bg-ink px-3 py-2.5 text-base text-paper placeholder:text-mist/70 focus:border-gold focus:outline-none";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClass, className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldClass, className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldClass, "min-h-24", className)} {...props} />;
}

export function Label({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-xs font-semibold uppercase tracking-wider text-mist", className)}
      {...props}
    />
  );
}
