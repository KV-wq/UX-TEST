"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { DASHBOARD_ONBOARDING_MESSAGE } from "./dashboard-onboarding";
import { buildSeedPayloads } from "./seed-demo-data";
import { spreadCreatedAtAcrossDays } from "./spread-creation-times";
import {
  applyPatchToDeal,
  filterDealsForBulk,
  type DealPatch,
} from "./bulk-deals";
import type {
  AgentAction,
  ChatMessage,
  Client,
  Deal,
  HighlightTarget,
  User,
} from "./types";

interface AppState {
  user: User | null;
  clients: Client[];
  deals: Deal[];
  analyticsVisible: boolean;
  highlight: HighlightTarget | null;
  messages: ChatMessage[];
  pendingDashboardGuide: boolean;
  dashboardGuideCompleted: boolean;
  overviewInsightText: string | null;
  overviewInsightLoading: boolean;

  setUser: (u: User | null) => void;
  addClient: (c: Omit<Client, "id" | "createdAt" | "extra" | "stage"> & {
    stage?: Client["stage"];
    extra?: Record<string, string | number>;
    createdAt?: number;
  }) => Client;
  addDeal: (d: Omit<Deal, "id" | "createdAt" | "extra" | "stage"> & {
    stage?: Deal["stage"];
    extra?: Record<string, string | number>;
    createdAt?: number;
    clientId?: string;
  }) => Deal;
  updateClientStage: (id: string, stage: Client["stage"]) => void;
  updateDealStage: (id: string, stage: Deal["stage"]) => void;
  updateDeal: (
    id: string,
    patch: {
      title?: string;
      amount?: number;
      clientName?: string;
      clientId?: string;
      stage?: Deal["stage"];
    }
  ) => void;
  bulkUpdateDeals: (
    payload: {
      applyToAll?: boolean;
      dealIds?: string[];
      filterStage?: Deal["stage"];
      titleContains?: string;
      patch: DealPatch;
    }
  ) => void;
  deleteClient: (id: string) => void;
  deleteDeal: (id: string) => void;
  setAnalyticsVisible: (v: boolean) => void;
  setHighlight: (t: HighlightTarget | null) => void;
  pushMessage: (m: ChatMessage) => void;
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
  resetChat: () => void;
  setOverviewInsight: (text: string | null) => void;
  setOverviewInsightLoading: (v: boolean) => void;
  clearCrmData: () => void;
  applyAction: (action: AgentAction) => void;
  setPendingDashboardGuide: (v: boolean) => void;
  setDashboardGuideCompleted: (v: boolean) => void;
  tryInjectDashboardOnboarding: () => boolean;
  syncDealClientLinks: () => void;
  resetAll: () => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      clients: [],
      deals: [],
      analyticsVisible: true,
      highlight: null,
      messages: [],
      pendingDashboardGuide: false,
      dashboardGuideCompleted: false,
      overviewInsightText: null,
      overviewInsightLoading: false,

      setUser: (u) => set({ user: u }),
      setOverviewInsight: (text) => set({ overviewInsightText: text }),
      setOverviewInsightLoading: (v) => set({ overviewInsightLoading: v }),
      clearCrmData: () =>
        set({
          clients: [],
          deals: [],
          overviewInsightText: null,
          overviewInsightLoading: false,
        }),
      setPendingDashboardGuide: (v) => set({ pendingDashboardGuide: v }),
      setDashboardGuideCompleted: (v) => set({ dashboardGuideCompleted: v }),

      syncDealClientLinks: () =>
        set((s) => {
          const map = new Map(
            s.clients.map((c) => [c.name.trim().toLowerCase(), c.id] as const)
          );
          return {
            deals: s.deals.map((d) => {
              if (d.clientId) return d;
              const n = d.clientName?.trim().toLowerCase();
              if (!n) return d;
              const cid = map.get(n);
              return cid ? { ...d, clientId: cid } : d;
            }),
          };
        }),

      tryInjectDashboardOnboarding: () => {
        let added = false;
        set((state) => {
          if (state.dashboardGuideCompleted || !state.pendingDashboardGuide) {
            return state;
          }
          added = true;
          return {
            messages: [
              ...state.messages,
              {
                id: uid(),
                role: "assistant" as const,
                content: DASHBOARD_ONBOARDING_MESSAGE,
                createdAt: Date.now(),
              },
            ],
            pendingDashboardGuide: false,
            dashboardGuideCompleted: true,
          };
        });
        return added;
      },

      addClient: (c) => {
        const client: Client = {
          id: uid(),
          name: c.name,
          email: c.email,
          phone: c.phone,
          company: c.company,
          stage: c.stage ?? "new",
          extra: c.extra ?? {},
          createdAt: c.createdAt ?? Date.now(),
        };
        set((s) => ({ clients: [client, ...s.clients] }));
        return client;
      },

      addDeal: (d) => {
        const deal: Deal = {
          id: uid(),
          title: d.title,
          amount: d.amount,
          clientName: d.clientName,
          clientId: d.clientId,
          stage: d.stage ?? "new",
          extra: d.extra ?? {},
          createdAt: d.createdAt ?? Date.now(),
        };
        set((s) => ({ deals: [deal, ...s.deals] }));
        return deal;
      },

      updateClientStage: (id, stage) =>
        set((s) => ({
          clients: s.clients.map((c) => (c.id === id ? { ...c, stage } : c)),
        })),

      updateDealStage: (id, stage) =>
        set((s) => ({
          deals: s.deals.map((d) => (d.id === id ? { ...d, stage } : d)),
        })),

      updateDeal: (id, patch) =>
        set((s) => ({
          deals: s.deals.map((d) => {
            if (d.id !== id) return d;
            const next = { ...d };
            if (patch.title !== undefined) next.title = patch.title;
            if (patch.amount !== undefined) next.amount = patch.amount;
            if (patch.clientName !== undefined)
              next.clientName = patch.clientName.trim() || undefined;
            if (patch.clientId !== undefined) next.clientId = patch.clientId;
            if (patch.stage !== undefined) next.stage = patch.stage;
            return next;
          }),
        })),

      bulkUpdateDeals: (payload) =>
        set((s) => {
          const targets = filterDealsForBulk(s.deals, payload);
          const idSet = new Set(targets.map((d) => d.id));
          return {
            deals: s.deals.map((d) =>
              idSet.has(d.id) ? applyPatchToDeal(d, payload.patch) : d
            ),
          };
        }),

      deleteClient: (id) =>
        set((s) => ({
          clients: s.clients.filter((c) => c.id !== id),
          deals: s.deals.map((d) =>
            d.clientId === id ? { ...d, clientId: undefined } : d
          ),
        })),

      deleteDeal: (id) =>
        set((s) => ({ deals: s.deals.filter((d) => d.id !== id) })),

      setAnalyticsVisible: (v) => set({ analyticsVisible: v }),
      setHighlight: (t) => set({ highlight: t }),

      pushMessage: (m) =>
        set((s) => ({ messages: [...s.messages, m] })),

      updateMessage: (id, patch) =>
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === id ? { ...m, ...patch } : m
          ),
        })),

      resetChat: () => set({ messages: [] }),

      applyAction: (action) => {
        const state = get();
        switch (action.type) {
          case "registerUser": {
            state.setUser({ ...action.payload, createdAt: Date.now() });
            set({ dashboardGuideCompleted: false });
            break;
          }
          case "addClient": {
            state.addClient(action.payload);
            break;
          }
          case "addDeal": {
            state.addDeal(action.payload);
            break;
          }
          case "updateDeal": {
            const { id, ...patch } = action.payload;
            state.updateDeal(id, patch);
            break;
          }
          case "bulkUpdateDeals": {
            const p = action.payload;
            state.bulkUpdateDeals({
              applyToAll: p.applyToAll,
              dealIds: p.dealIds,
              filterStage: p.filterStage,
              titleContains: p.titleContains,
              patch: p.patch,
            });
            break;
          }
          case "showAnalytics": {
            state.setAnalyticsVisible(true);
            state.setHighlight("analytics");
            break;
          }
          case "highlight": {
            state.setHighlight(action.payload.target);
            break;
          }
          case "navigate": {
            if (action.payload.to === "dashboard") {
              set({ pendingDashboardGuide: true });
            }
            break;
          }
          case "seedDemoData": {
            const { clientPayloads, dealPayloads } = buildSeedPayloads(
              action.payload.clientCount,
              action.payload.dealCount
            );
            for (const p of clientPayloads) {
              state.addClient(p);
            }
            for (const p of dealPayloads) {
              state.addDeal(p);
            }
            state.setAnalyticsVisible(true);
            break;
          }
          case "addClientsBatch": {
            for (const p of action.payload.clients) {
              state.addClient(p);
            }
            state.setAnalyticsVisible(true);
            break;
          }
          case "addDealsBatch": {
            for (const p of action.payload.deals) {
              state.addDeal(p);
            }
            state.setAnalyticsVisible(true);
            break;
          }
          case "spreadCreationTimes": {
            const { scope, days } = action.payload;
            set((s) => {
              let clients = s.clients;
              let deals = s.deals;
              if (scope === "clients" || scope === "both") {
                clients = spreadCreatedAtAcrossDays(s.clients, days);
              }
              if (scope === "deals" || scope === "both") {
                deals = spreadCreatedAtAcrossDays(s.deals, days);
              }
              return { clients, deals };
            });
            state.setAnalyticsVisible(true);
            break;
          }
        }
      },

      resetAll: () =>
        set({
          user: null,
          clients: [],
          deals: [],
          analyticsVisible: true,
          highlight: null,
          messages: [],
          pendingDashboardGuide: false,
          dashboardGuideCompleted: false,
          overviewInsightText: null,
          overviewInsightLoading: false,
        }),
    }),
    {
      name: "amoai-demo-store",
      version: 1,
      migrate: (persisted) => {
        if (!persisted || typeof persisted !== "object") return persisted;
        const o = { ...(persisted as Record<string, unknown>) };
        delete o.fields;
        if (o.analyticsVisible === undefined) o.analyticsVisible = true;
        if (o.pendingDashboardGuide === undefined) o.pendingDashboardGuide = false;
        if (o.dashboardGuideCompleted === undefined) o.dashboardGuideCompleted = false;
        return o;
      },
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        clients: state.clients,
        deals: state.deals,
        analyticsVisible: state.analyticsVisible,
        messages: state.messages,
        pendingDashboardGuide: state.pendingDashboardGuide,
        dashboardGuideCompleted: state.dashboardGuideCompleted,
      }),
    }
  )
);
