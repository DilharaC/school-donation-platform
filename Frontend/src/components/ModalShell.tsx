import React, { useEffect } from "react";
import ReactDOM from "react-dom";

const cx = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");

type ModalShellProps = {
  open: boolean;
  onClose: () => void;
  titleLeft?: string;
  subtitleLeft?: string;
  leftBullets?: string[];
  leftImageUrl?: string; // ✅ full background image for left side
  children: React.ReactNode;
  widthClassName?: string; // e.g. "max-w-4xl"
};

export default function ModalShell({
  open,
  onClose,

  leftImageUrl,
  children,
  widthClassName = "max-w-4xl",
}: ModalShellProps) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[90]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/35 backdrop-blur-[1px] transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className={cx(
            "w-full rounded-3xl bg-white shadow-2xl overflow-hidden border border-white/40",
            widthClassName
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-1 md:grid-cols-2">
{/* Left panel */}
<div className="relative hidden md:block overflow-hidden">
  {/* Background image */}
  {leftImageUrl ? (
    <img
      src={leftImageUrl}
      alt=""
      className="absolute inset-0 h-full w-full object-cover object-center"
      draggable={false}
    />
  ) : (
    <div className="absolute inset-0 bg-slate-100" />
  )}

  {/* Light tint */}
  <div className="absolute inset-0 bg-black/5" />

  {/* Soft readability fade */}
  <div className="absolute inset-0 bg-gradient-to-r from-white/70 via-white/25 to-transparent" />

  {/* Content wrapper */}
  <div className="relative p-10 h-full flex flex-col">
    {/* (Your content area if needed) */}
  </div>

  {/* ✅ Footer text */}
 {/* Centered footer */}
<div className="absolute bottom-8 left-1/2 -translate-x-1/2">
  <div className="px-4 py-2 rounded-xl bg-white/60 backdrop-blur-sm border border-white/70 shadow-sm">
    <span className="text-xs font-medium text-slate-800 whitespace-nowrap">
      Every contribution brings opportunity closer.
    </span>
  </div>
</div>
</div>
            {/* Right panel */}
            <div className="relative p-6 sm:p-8">
              <button
                onClick={onClose}
                className="absolute right-4 top-4 h-9 w-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-black"
                aria-label="Close"
              >
                ×
              </button>

              {children}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}