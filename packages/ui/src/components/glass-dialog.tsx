"use client";

/**
 * GlassDialog — accessible modal with Liquid Glass styling.
 * Backdrop blur + spring entrance; closes on Escape / backdrop click.
 *
 * Rendered through a portal onto <body>: ancestors with backdrop-filter or
 * transforms (glass cards, framer-motion wrappers) hijack position:fixed and
 * clip the dialog otherwise.
 */
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "../lib/cn.js";

export interface GlassDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  /** When false, children manage their own scroll region (e.g. token picker lists). */
  scrollBody?: boolean;
}

/** Lift bottom sheets above the mobile virtual keyboard (iOS Safari, Android Chrome). */
function useMobileSheetInsets(active: boolean) {
  const [style, setStyle] = useState<CSSProperties>({});

  useEffect(() => {
    if (!active) {
      setStyle({});
      return;
    }

    const vv = window.visualViewport;
    if (!vv) return;

    const sync = () => {
      const keyboardInset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      const keyboardOpen = keyboardInset > 80;
      setStyle({
        maxHeight: keyboardOpen ? `${Math.floor(vv.height * 0.92)}px` : undefined,
        marginBottom: keyboardInset > 0 ? keyboardInset : undefined,
      });
    };

    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
    };
  }, [active]);

  return style;
}

export function GlassDialog({
  open,
  onClose,
  title,
  children,
  className,
  scrollBody = true,
}: GlassDialogProps) {
  const [mounted, setMounted] = useState(false);
  const sheetStyle = useMobileSheetInsets(open);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-modal
          role="dialog"
          aria-label={title}
        >
          <motion.button
            type="button"
            aria-label="Close dialog"
            className="absolute inset-0 bg-ink/30 backdrop-blur-md"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className={cn(
              "relative z-10 flex max-h-[min(88dvh,100%)] w-full max-w-lg flex-col overflow-hidden rounded-t-glass bg-white/90 p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-glass-lg ring-1 ring-white/80 backdrop-blur-2xl sm:max-h-[88dvh] sm:rounded-glass sm:p-6",
              className,
            )}
            style={sheetStyle}
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
          >
            <span className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-ink/15 sm:hidden" aria-hidden />
            <div className="mb-4 flex shrink-0 items-center justify-between">
              {title && <h2 className="font-display text-lg font-bold text-ink">{title}</h2>}
              <button
                onClick={onClose}
                className="ml-auto rounded-full p-1.5 text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div
              className={cn(
                "min-h-0 flex-1",
                scrollBody ? "thin-scroll overflow-y-auto" : "flex flex-col overflow-hidden",
              )}
            >
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
