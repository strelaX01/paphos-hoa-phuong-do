"use client";

import { useEffect } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

export default function AdminToast({ message, onDismiss, tone = "success" }) {
  useEffect(() => {
    if (!message) return undefined;

    const timer = window.setTimeout(onDismiss, 3200);

    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) {
    return null;
  }

  const isError = tone === "error";
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <div className="fixed right-4 top-4 z-[80] w-[min(360px,calc(100vw-2rem))] rounded-lg border border-[#E4DAC9] bg-white p-4 text-[#2B2B2B] shadow-2xl">
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg ${
            isError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
          }`}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{isError ? "Something went wrong" : "Success"}</p>
          <p className="mt-0.5 text-sm leading-relaxed text-[#756D62]">{message}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-[#756D62] hover:bg-[#F6F1E8] hover:text-[#2B2B2B]"
          aria-label="Close notification"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
