"use client";

import { useEffect } from "react";
import { FA_ORIGIN } from "@/lib/fulltime/config";

export function FaFeed({
  code,
  fallbackHref,
  fallbackLabel,
}: {
  code: string;
  fallbackHref: string;
  fallbackLabel: string;
}) {
  useEffect(() => {
    const scriptId = `fa-cs-${code}`;
    if (document.getElementById(scriptId)) return;
    const script = document.createElement("script");
    script.id = scriptId;
    script.async = true;
    script.src = `${FA_ORIGIN}/js/cs1.html?cs=${encodeURIComponent(code)}&random=${Date.now()}`;
    document.body.appendChild(script);
  }, [code]);

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-panel p-4">
      <div
        id={`lrep${code}`}
        className="mx-auto text-xs leading-5 text-mist"
        style={{ width: 350 }}
      >
        Data loading....{" "}
        <a className="text-gold underline-offset-2 hover:underline" href={fallbackHref}>
          {fallbackLabel}
        </a>
      </div>
    </div>
  );
}
