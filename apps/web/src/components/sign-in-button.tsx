"use client";

/**
 * SignInButton — SIWE-style backend session bootstrap.
 * After the wallet connects (RainbowKit), this signs a nonce challenge and
 * exchanges it for a JWT (granting ADMIN role to allowlisted addresses).
 */
import { useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { KeyRound, LogOut } from "lucide-react";
import { GlassButton, toast } from "@xauconnect/ui";
import { shortenAddress } from "@xauconnect/utils";
import { api } from "@/lib/api";
import { useSessionStore } from "@/lib/store";

export function SignInButton() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { token, address: sessionAddress, setSession, clearSession } = useSessionStore();
  const [loading, setLoading] = useState(false);

  if (!isConnected || !address) return null;

  const signedIn = Boolean(token) && sessionAddress === address.toLowerCase();

  async function signIn() {
    if (!address) return;
    setLoading(true);
    try {
      const { nonce, message } = await api.authChallenge(address);
      const signature = await signMessageAsync({ message });
      const { token: jwt, role } = await api.authVerify({ address, signature, nonce });
      setSession({ token: jwt, address: address.toLowerCase(), role });
      toast.success(`Signed in${role === "ADMIN" ? " as admin" : ""}`, {
        description: shortenAddress(address),
      });
    } catch (err) {
      toast.error("Sign-in failed", { description: (err as Error).message.slice(0, 120) });
    } finally {
      setLoading(false);
    }
  }

  return signedIn ? (
    <GlassButton
      variant="ghost"
      size="sm"
      className="rounded-full"
      onClick={() => clearSession()}
      title="Clear backend session"
    >
      <LogOut className="h-3.5 w-3.5" /> Session
    </GlassButton>
  ) : (
    <GlassButton variant="glass" size="sm" className="rounded-full" onClick={signIn} loading={loading}>
      <KeyRound className="h-3.5 w-3.5" /> Sign in
    </GlassButton>
  );
}
