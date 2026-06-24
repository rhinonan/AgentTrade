"use client";
import { useState, useEffect } from "react";

interface BottomSheetProps {
  triggerLabel: string;
  children: React.ReactNode;
  title?: string;
}

export function BottomSheet({ triggerLabel, children, title }: BottomSheetProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <div className="md:hidden">
      {/* Trigger bar — fixed to bottom */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-0 inset-x-0 z-40 flex items-center justify-center gap-2 py-3 bg-zinc-900/90 backdrop-blur-sm border-t border-zinc-800 active:bg-zinc-800/50 transition-colors"
        >
          <span className="w-8 h-1 rounded-full bg-zinc-600" />
          <span className="text-xs text-zinc-400">{triggerLabel}</span>
        </button>
      )}

      {/* Overlay + Sheet */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="relative bg-zinc-950 rounded-t-2xl border-t border-zinc-800 max-h-[75vh] overflow-y-auto animate-slide-up">
            {/* Drag handle bar */}
            <div className="sticky top-0 z-10 flex items-center justify-center px-4 py-3 bg-zinc-950 rounded-t-2xl border-b border-zinc-800/50">
              <span className="w-10 h-1 rounded-full bg-zinc-600" />
              <button
                onClick={() => setOpen(false)}
                className="absolute right-4 text-sm text-zinc-500 hover:text-zinc-300 w-8 h-8 flex items-center justify-center rounded-md hover:bg-zinc-800/50 transition-colors"
                aria-label="关闭"
              >
                ✕
              </button>
            </div>
            {title && (
              <h3 className="px-4 pt-3 text-sm font-medium text-zinc-300">{title}</h3>
            )}
            <div className="p-4">
              {children}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
