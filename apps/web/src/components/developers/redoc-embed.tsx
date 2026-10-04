"use client";

import { useEffect, useRef } from "react";

export function RedocEmbed({ specUrl = "/openapi.json" }: { specUrl?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js";
    script.async = true;
    script.onload = () => {
      // @ts-expect-error Redoc global from CDN
      if (window.Redoc) window.Redoc.init(specUrl, {}, el);
    };
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, [specUrl]);

  return <div ref={ref} className="min-h-[70vh] w-full rounded-2xl border border-white/40 bg-white/30" />;
}
