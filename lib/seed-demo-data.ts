import type { ClientStage, DealStage } from "./types";

const FIRST = [
  "Алексей",
  "Мария",
  "Иван",
  "Елена",
  "Дмитрий",
  "Ольга",
  "Сергей",
  "Анна",
  "Павел",
  "Наталья",
  "Тимур",
  "Юлия",
  "Виктор",
  "Ирина",
  "Константин",
  "София",
  "Максим",
  "Вероника",
];
const LAST = [
  "Иванов",
  "Петров",
  "Сидоров",
  "Козлов",
  "Новиков",
  "Морозов",
  "Волков",
  "Соколов",
  "Лебедев",
  "Кузнецов",
  "Попов",
  "Васильев",
  "Семёнов",
  "Голубев",
  "Виноградов",
  "Орлов",
  "Фёдоров",
];
const CLIENT_STAGES: ClientStage[] = [
  "new",
  "contacted",
  "qualified",
  "won",
  "lost",
];
const DEAL_STAGES: DealStage[] = ["new", "negotiation", "won", "lost"];
const DEAL_TOPICS = [
  "Внедрение",
  "Пилот",
  "Лицензия",
  "Сопровождение",
  "Интеграция",
  "Расширение",
  "Аудит",
  "Обучение",
];
const COMPANIES = [
  "Luma",
  "Nord Retail",
  "Sigma Tech",
  "Apex Group",
  "Orbit Lab",
  "Vector Food",
  "Kron Energy",
  "Atlas Media",
  "Helix Bank",
  "Polus Logistics",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomPhone(): string {
  let d = "";
  for (let i = 0; i < 9; i++) d += String(Math.floor(Math.random() * 10));
  return `+79${d}`;
}

function rnd(): string {
  return Math.random().toString(36).slice(2, 8);
}

function translit(s: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh",
    з: "z", и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o",
    п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
    ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
    я: "ya",
  };
  return s
    .toLowerCase()
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]/g, "");
}

export function buildSeedPayloads(clientCount: number, dealCount: number) {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const SPREAD_DAYS = 21;

  const clientPayloads = Array.from({ length: clientCount }, (_, i) => {
    const first = pick(FIRST);
    const last = pick(LAST);
    const company = pick(COMPANIES);
    const dayOffset = Math.floor(Math.random() * SPREAD_DAYS);
    const jitter = Math.floor(Math.random() * DAY);
    return {
      name: `${first} ${last}`,
      email: `${translit(first)}.${translit(last)}${rnd().slice(0, 2)}@${translit(company)}.ru`,
      phone: randomPhone(),
      company,
      stage: pick(CLIENT_STAGES),
      createdAt: now - dayOffset * DAY - jitter,
      _idx: i,
    };
  });

  const names = clientPayloads.map((p) => p.name);
  const pool = names.length ? names : ["Демо-клиент"];

  const dealPayloads = Array.from({ length: dealCount }, (_, i) => {
    const dayOffset = Math.floor(Math.random() * SPREAD_DAYS);
    const jitter = Math.floor(Math.random() * DAY);
    return {
      title: `${pick(DEAL_TOPICS)} №${i + 1}`,
      amount: Math.round((30_000 + Math.random() * 470_000) / 1000) * 1000,
      clientName: pick(pool),
      stage: pick(DEAL_STAGES),
      createdAt: now - dayOffset * DAY - jitter,
    };
  });

  const cleanClients = clientPayloads.map(({ _idx: _i, ...rest }) => rest);

  return { clientPayloads: cleanClients, dealPayloads };
}
