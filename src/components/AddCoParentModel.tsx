import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Props = {
  plantId: string;
  plantName: string;
  open: boolean;
  onClose: () => void;
  onAdded?: (userId: string) => void;
};

export default function AddCoParent({ plantId, plantName, open, onClose, onAdded }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setEmail("");
      setMsg(null);
      setInviteUrl(null);
      setLoading(false);
    }
  }, [open]);

  const canSubmit = useMemo(() => {
    return email.trim().length > 3 && /\S+@\S+\.\S+/.test(email);
  }, [email]);

  if (!open) return null;

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setMsg(null);
    setInviteUrl(null);

    try {
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url")
        .ilike("email", email)
        .maybeSingle();

      if (profileErr) throw profileErr;

      if (profile?.id) {
        const { error: insertErr } = await supabase
          .from("plant_caretakers")
          .insert({ plant_id: plantId, user_id: profile.id, role: "COPARENT" });

        if (insertErr) {
          if ((insertErr as any).code === "23505") {
            setMsg("This person is already a co-parent for this plant.");
          } else {
            throw insertErr;
          }
        } else {
          setMsg("Added as co-parent!");
          onAdded?.(profile.id);
          setEmail("");
        }
      } else {
        const { data: invite, error: inviteErr } = await supabase
          .from("plant_invites")
          .insert({ plant_id: plantId, email })
          .select("id")
          .single();

        if (inviteErr) throw inviteErr;

        const url = new URL("/accept-invite/" + invite.id, window.location.origin).toString();
        setInviteUrl(url);

        const { data: authData } = await supabase.auth.getUser();
        const inviterName = String(authData.user?.user_metadata?.full_name ?? authData.user?.email ?? "Someone");

        supabase.functions.invoke("send-invite-email", {
          body: { inviteUrl: url, inviteeEmail: email, plantName, inviterName },
        }).catch(() => {});

        setMsg("Invite sent! They will get an email with a link to join.");
      }
    } catch (err: any) {
      setMsg(err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setMsg("Invite link copied to clipboard.");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Invite a co-parent</h2>
          <button onClick={onClose} className="rounded px-2 py-1 text-sm hover:bg-gray-100">x</button>
        </div>

        <form onSubmit={handleInvite} className="space-y-3">
          <label className="block text-sm font-medium">
            Email
            <input
              type="email"
              className="mt-1 w-full rounded border p-2"
              placeholder="friend@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="w-full rounded bg-leaf-600 p-2 text-white disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send invite"}
          </button>
        </form>

        {msg && <p className="mt-3 text-sm text-gray-700">{msg}</p>}

        {inviteUrl && (
          <div className="mt-3 rounded border p-2">
            <div className="mb-2 text-xs text-gray-500">Or share this link manually:</div>
            <div className="flex items-center gap-2">
              <input className="w-full rounded border p-2 text-xs" value={inviteUrl} readOnly />
              <button onClick={copyLink} className="rounded border px-2 py-1 text-sm">Copy</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
