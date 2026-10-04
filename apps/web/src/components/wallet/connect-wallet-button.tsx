"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { GlassButton, cn } from "@xauconnect/ui";

export interface ConnectWalletButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

/** Primary connect CTA — gold pill, no backdrop shadow. */
export const ConnectWalletButton = forwardRef<HTMLButtonElement, ConnectWalletButtonProps>(
  ({ className, children, loading, disabled, ...props }, ref) => (
    <GlassButton
      ref={ref}
      type="button"
      variant="gold"
      size="md"
      loading={loading}
      disabled={disabled}
      className={cn(
        "min-h-11 rounded-full px-4 text-sm font-semibold tracking-tight sm:min-h-11 sm:px-6 sm:text-[0.9375rem]",
        className,
      )}
      {...props}
    >
      {children ?? (
        <>
          <span className="sm:hidden">Connect</span>
          <span className="hidden sm:inline">Connect wallet</span>
        </>
      )}
    </GlassButton>
  ),
);
ConnectWalletButton.displayName = "ConnectWalletButton";
