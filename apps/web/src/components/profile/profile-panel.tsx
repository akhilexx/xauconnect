"use client";

/**
 * ProfilePanel — wallet-bound social identity. Users sign in with their
 * wallet, then attach display name + social handles (X, Telegram, Discord,
 * website) which are stored against their on-chain address.
 */
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AtSign,
  Globe,
  KeyRound,
  MessageCircle,
  Save,
  Send,
  Twitter,
  UserCircle2,
} from "lucide-react";
import type { UserSocialProfile } from "@xauconnect/sdk";
import { shortenAddress } from "@xauconnect/utils";
import { GlassButton, GlassCard, Skeleton, toast } from "@xauconnect/ui";
import { api } from "@/lib/api";
import { useSessionStore } from "@/lib/store";
import { BrandMark } from "@/components/brand-logo";

const FIELDS = [
  { key: "displayName", label: "Display name", icon: UserCircle2, placeholder: "Golden Degen" },
  { key: "twitter", label: "X (Twitter)", icon: Twitter, placeholder: "@yourhandle" },
  { key: "telegram", label: "Telegram", icon: Send, placeholder: "@yourhandle" },
  { key: "discord", label: "Discord", icon: MessageCircle, placeholder: "username" },
  { key: "website", label: "Website", icon: Globe, placeholder: "https://yoursite.xyz" },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

export function ProfilePanel() {
  const { token, address } = useSessionStore();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<UserSocialProfile>({});

  const signedIn = Boolean(token) && address !== "admin:console";

  const profileQuery = useQuery({
    queryKey: ["profile", address],
    enabled: signedIn,
    queryFn: () => api.getProfile(),
  });

  useEffect(() => {
    if (profileQuery.data?.profile) {
      setForm(
        Object.fromEntries(
          Object.entries(profileQuery.data.profile).filter(([, v]) => v != null),
        ) as UserSocialProfile,
      );
    }
  }, [profileQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => api.updateProfile(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", address] });
      toast.success("Profile saved", { description: "Your socials are now connected." });
    },
    onError: (err) =>
      toast.error("Could not save profile", { description: (err as Error).message.slice(0, 120) }),
  });

  if (!signedIn) {
    return (
      <GlassCard
        variant="strong"
        padding="lg"
        className="flex flex-col items-center gap-4 py-12 text-center"
      >
        <BrandMark size={56} className="rounded-xl" />
        <div>
          <h2 className="font-display text-xl font-extrabold">Sign in to connect socials</h2>
          <p className="mt-2 max-w-sm text-sm text-ink-muted">
            Connect your wallet and use the <strong>Sign in</strong> button in the navbar — your
            social profile is bound to your wallet address.
          </p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard variant="strong" padding="lg" className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gold/20 blur-3xl"
        aria-hidden
      />

      <div className="relative flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-gradient shadow-glass">
          <AtSign className="h-5 w-5 text-white" />
        </span>
        <div>
          <p className="font-display text-lg font-bold leading-tight">
            {form.displayName || "Anonymous trader"}
          </p>
          <p className="text-xs text-ink-muted">{address ? shortenAddress(address) : ""}</p>
        </div>
      </div>

      {profileQuery.isLoading ? (
        <div className="relative mt-6 flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="relative mt-6 flex flex-col gap-3.5"
        >
          {FIELDS.map(({ key, label, icon: Icon, placeholder }) => (
            <div key={key} className="gradient-border-soft rounded-2xl p-3.5">
              <label
                htmlFor={`profile-${key}`}
                className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted"
              >
                {label}
              </label>
              <div className="mt-1 flex items-center gap-2">
                <Icon className="h-4 w-4 shrink-0 text-gold-deep" />
                <input
                  id={`profile-${key}`}
                  value={form[key as FieldKey] ?? ""}
                  onChange={(e) =>
                    setForm((f: UserSocialProfile) => ({ ...f, [key]: e.target.value }))
                  }
                  placeholder={placeholder}
                  className="w-full bg-transparent text-sm font-semibold text-ink outline-none placeholder:text-ink-faint"
                />
              </div>
            </div>
          ))}

          <GlassButton
            size="lg"
            type="submit"
            className="mt-1"
            loading={saveMutation.isPending}
            disabled={saveMutation.isPending}
          >
            <Save className="h-4 w-4" /> Save profile
          </GlassButton>

          {profileQuery.data?.profile === null && (
            <p className="text-center text-xs text-ink-faint">
              Demo mode — profiles persist once the database is connected.
            </p>
          )}
        </form>
      )}
    </GlassCard>
  );
}
