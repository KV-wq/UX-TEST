export type ChatRole = "user" | "assistant" | "system" | "tool";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  pending?: boolean;
  actions?: AgentAction[];
}

export interface User {
  name: string;
  email: string;
  company: string;
  role: string;
  companyAbout?: string;
  createdAt: number;
}

export type ClientStage = "new" | "contacted" | "qualified" | "won" | "lost";
export type DealStage = "new" | "negotiation" | "won" | "lost";
export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  stage: ClientStage;
  extra: Record<string, string | number>;
  createdAt: number;
}

export interface Deal {
  id: string;
  title: string;
  amount: number;
  clientName?: string;
  clientId?: string;
  stage: DealStage;
  extra: Record<string, string | number>;
  createdAt: number;
}

export type HighlightTarget = "clients" | "deals" | "analytics";

export type AgentAction =
  | { type: "registerUser"; payload: Omit<User, "createdAt"> }
  | { type: "navigate"; payload: { to: "home" | "dashboard" } }
  | {
      type: "addClient";
      payload: {
        name: string;
        email?: string;
        phone?: string;
        company?: string;
        stage?: ClientStage;
        createdAt?: number;
      };
    }
  | {
      type: "addDeal";
      payload: {
        title: string;
        amount: number;
        clientName?: string;
        clientId?: string;
        stage?: DealStage;
        createdAt?: number;
      };
    }
  | {
      type: "updateDeal";
      payload: {
        id: string;
        title?: string;
        amount?: number;
        clientName?: string;
        clientId?: string;
        stage?: DealStage;
      };
    }
  | {
      type: "bulkUpdateDeals";
      payload: {
        applyToAll?: boolean;
        dealIds?: string[];
        filterStage?: DealStage;
        titleContains?: string;
        patch: {
          title?: string;
          amount?: number;
          clientName?: string;
          stage?: DealStage;
        };
        matchedCount?: number;
      };
    }
  | {
      type: "addClientsBatch";
      payload: {
        clients: {
          name: string;
          email?: string;
          phone?: string;
          company?: string;
          stage?: ClientStage;
          createdAt?: number;
        }[];
      };
    }
  | {
      type: "addDealsBatch";
      payload: {
        deals: {
          title: string;
          amount: number;
          clientName?: string;
          clientId?: string;
          stage?: DealStage;
          createdAt?: number;
        }[];
      };
    }
  | { type: "showAnalytics"; payload: { metrics?: string[] } }
  | { type: "highlight"; payload: { target: HighlightTarget } }
  | {
      type: "seedDemoData";
      payload: { clientCount: number; dealCount: number };
    }
  | {
      type: "spreadCreationTimes";
      payload: {
        scope: "deals" | "clients" | "both";
        days: number;
      };
    };
