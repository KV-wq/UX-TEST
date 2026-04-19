import { useAppStore } from "@/lib/store";

type S = ReturnType<typeof useAppStore.getState>;
type AddClientIn = Parameters<S["addClient"]>[0];
type AddDealIn = Parameters<S["addDeal"]>[0];

export async function applySmartSeed(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const { clearCrmData, addClient, addDeal, user } = useAppStore.getState();
  clearCrmData();
  const res = await fetch("/api/seed-smart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      company: user?.company,
      companyAbout: user?.companyAbout,
    }),
  });
  const data = (await res.json()) as {
    clients?: AddClientIn[];
    deals?: AddDealIn[];
    error?: string;
  };
  if (!res.ok || data.error) {
    return { ok: false, error: data.error ?? `HTTP ${res.status}` };
  }
  for (const c of data.clients ?? []) {
    addClient({ ...c, extra: c.extra ?? {} });
  }
  for (const d of data.deals ?? []) {
    addDeal({ ...d, extra: d.extra ?? {} });
  }
  return { ok: true };
}
