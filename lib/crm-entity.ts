import type { Client, Deal } from "@/lib/types";

export function dealsForClient(client: Client, deals: Deal[]): Deal[] {
  const nl = client.name.trim().toLowerCase();
  return deals.filter(
    (d) =>
      d.clientId === client.id ||
      (!d.clientId && d.clientName?.trim().toLowerCase() === nl)
  );
}

export function findClientForDeal(
  deal: Deal,
  clients: Client[]
): Client | undefined {
  if (deal.clientId) return clients.find((c) => c.id === deal.clientId);
  const n = deal.clientName?.trim().toLowerCase();
  if (!n) return undefined;
  return clients.find((c) => c.name.trim().toLowerCase() === n);
}
