type Caretaker = {
  id: string;
  name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
};

type Props =
  | {
      caretakers: Caretaker[]; // preferred: pass the list you already have
      count?: never;
      className?: string;
      showFaces?: boolean;
    }
  | {
      caretakers?: never;
      count: number; // or just pass the count if you don't have the list
      className?: string;
      showFaces?: boolean;
    };

export default function SharedPlantBadge(props: Props) {
  const total =
    "count" in props
      ? props.count
      : Array.isArray(props.caretakers)
      ? props.caretakers.length
      : 0;

  if (!total || total <= 1) return null; // only show if shared

  // For the little face stack, take up to 3
  const faces =
    "caretakers" in props && props.caretakers
      ? props.caretakers.slice(0, 3)
      : [];

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border bg-white px-2 py-1 text-xs shadow-sm ${props.className ?? ""}`}
      title={`Shared with ${total - 1} co-parent${total - 1 === 1 ? "" : "s"}`}
    >
      <span>👥 Shared</span>
      <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px]">{total}</span>

      {"showFaces" in props && props.showFaces && faces.length > 0 && (
        <div className="ml-1 flex -space-x-2">
          {faces.map((c) => (
            <span
              key={c.id}
              className="inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border bg-gray-100 text-[10px]"
              title={c.name ?? c.email ?? "Co-parent"}
            >
              {c.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                (c.name ?? c.email ?? "?").slice(0, 2).toUpperCase()
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
