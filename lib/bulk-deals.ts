import type { Deal, DealStage } from "./types";

export type BulkDealSelection = {
  applyToAll?: boolean;
  dealIds?: string[];
  filterStage?: DealStage;
  titleContains?: string;
};

export type DealPatch = {
  title?: string;
  amount?: number;
  clientName?: string;
  stage?: DealStage;
};

export function filterDealsForBulk(
  deals: Deal[],
  sel: BulkDealSelection
): Deal[] {
  if (sel.applyToAll) return deals.slice();
  if (sel.dealIds && sel.dealIds.length > 0) {
    const idSet = new Set(sel.dealIds);
    return deals.filter((d) => idSet.has(d.id));
  }
  return deals.filter((d) => {
    let ok = true;
    if (sel.filterStage !== undefined) ok = ok && d.stage === sel.filterStage;
    if (sel.titleContains && sel.titleContains.trim()) {
      const q = sel.titleContains.trim().toLowerCase();
      ok = ok && d.title.toLowerCase().includes(q);
    }
    return ok;
  });
}

export function applyPatchToDeal(d: Deal, patch: DealPatch): Deal {
  const next = { ...d };
  if (patch.title !== undefined) next.title = patch.title;
  if (patch.amount !== undefined) next.amount = patch.amount;
  if (patch.clientName !== undefined)
    next.clientName = patch.clientName.trim() || undefined;
  if (patch.stage !== undefined) next.stage = patch.stage;
  return next;
}
