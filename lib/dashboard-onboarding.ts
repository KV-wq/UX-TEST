export const DASHBOARD_ONBOARDING_MESSAGE = `Вы в рабочем столе TEST UX.

Слева — разделы: «Обзор» с KPI и графиком, «Клиенты» (таблица с фильтрами), «Сделки» (канбан с перетаскиванием), «Аналитика» (воронка и динамика).

Я могу создавать записи, двигать сделки по стадиям и отвечать на вопросы по данным. Выберите шаг ниже или напишите своими словами.`;

export type DashboardOnboardingChoice =
  | { label: string; prompt: string }
  | { label: string; smartSeed: true };

export const DASHBOARD_ONBOARDING_CHOICES: DashboardOnboardingChoice[] = [
  {
    label: "Добавить клиента",
    prompt:
      "Добавь клиента Алексей Демо, alex@demo.ru, телефон +79001234567, компания Демо ООО",
  },
  {
    label: "Создать сделку",
    prompt:
      "Создай сделку «Пилотное внедрение» на 200000 рублей для клиента Алексей Демо",
  },
  {
    label: "Сводка по воронке",
    prompt:
      "Дай краткую сводку по воронке: где застряли сделки и что стоит дожать",
  },
  {
    label: "Заполнить CRM тестовыми данными",
    smartSeed: true,
  },
];
