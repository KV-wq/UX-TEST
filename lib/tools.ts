export const OPENAI_TOOLS = [
  {
    type: "function",
    function: {
      name: "registerUser",
      description:
        "Зарегистрировать пользователя после сбора данных: имя, email, компания, роль и кратко чем занимается компания (1–2 предложения). Поле companyAbout — суть ответа пользователя о бизнесе; если на вопрос об отказе — пустая строка. Вызывай сразу когда всё есть.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Полное имя пользователя" },
          email: { type: "string", description: "Рабочий email" },
          company: { type: "string", description: "Название компании" },
          role: { type: "string", description: "Должность / роль" },
          companyAbout: {
            type: "string",
            description:
              "Кратко о компании своими словами пользователя (чем занимаются), без выдумывания",
          },
        },
        required: ["name", "email", "company", "role"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "navigate",
      description:
        "Перейти на другую страницу приложения. После успешной регистрации СРАЗУ вызывай navigate с to='dashboard'.",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", enum: ["home", "dashboard"] },
        },
        required: ["to"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "addClient",
      description:
        "Один клиент. Если пользователь прислал список, таблицу или много имён — распарси и вызови addClientsBatch одним вызовом. Вызови в той же реплике, как только хватает данных: обязательно только имя (name). Остальные поля — только если пользователь их дал; не заставляй пользователя докидывать email/телефон. ЗАПРЕЩЕНО писать «добавляю» без вызова функции.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          company: { type: "string" },
          stage: {
            type: "string",
            enum: ["new", "contacted", "qualified", "won", "lost"],
          },
          createdAtISO: {
            type: "string",
            description:
              "YYYY-MM-DD. Если пользователь просит «на сегодня» / «сегодня» — передай РОВНО todayISO из системного JSON. Иначе — явная дата («вчера», «14 апреля»). Если дата не важна — не передавай.",
          },
        },
        required: ["name"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "addDeal",
      description:
        "Создать новую сделку. Чтобы изменить уже существующую — updateDeal с dealId из списка deals в системном промпте. Для нескольких новых подряд — addDealsBatch.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          amount: { type: "number", description: "Сумма сделки в рублях" },
          clientName: { type: "string" },
          clientId: {
            type: "string",
            description:
              "id клиента из JSON clients (поле id), если известен. Иначе clientName.",
          },
          stage: {
            type: "string",
            enum: ["new", "negotiation", "won", "lost"],
          },
          createdAtISO: {
            type: "string",
            description:
              "YYYY-MM-DD. «на сегодня» / «сегодня» = todayISO из JSON. Иначе явная дата.",
          },
        },
        required: ["title", "amount"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "updateDeal",
      description:
        "Ровно одна существующая сделка: сумма, название, стадия, клиент. dealId — из JSON deals в системном промпте (поле id), сопоставь сделку по названию/сумме при необходимости. Одна правка — один вызов.",
      parameters: {
        type: "object",
        properties: {
          dealId: {
            type: "string",
            description: "id сделки из текущего состояния CRM",
          },
          title: { type: "string" },
          amount: { type: "number", description: "Новая сумма в рублях" },
          clientName: { type: "string", description: "Имя клиента или пусто" },
          stage: {
            type: "string",
            enum: ["new", "negotiation", "won", "lost"],
          },
        },
        required: ["dealId"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "bulkUpdateDeals",
      description:
        "Несколько сделок или все сразу: одно и то же изменение (patch) к выборке. Либо applyToAll=true (все сделки), либо dealIds с id из deals в контексте, либо фильтр: filterStage и/или titleContains (подстрока в названии, без учёта регистра). Не смешивай: при applyToAll игнорируй фильтры. Нужны хотя бы одно поле изменения: title, amount, clientName или stage.",
      parameters: {
        type: "object",
        properties: {
          applyToAll: {
            type: "boolean",
            description:
              "Если true — применить patch ко всем сделкам в базе",
          },
          dealIds: {
            type: "array",
            items: { type: "string" },
            description:
              "Список id сделок из контекста; если не пустой — правишь только их",
          },
          filterStage: {
            type: "string",
            enum: ["new", "negotiation", "won", "lost"],
            description:
              "Вместе с titleContains или отдельно: только сделки в этой стадии",
          },
          titleContains: {
            type: "string",
            description:
              "Подстрока в названии сделки; можно вместе с filterStage",
          },
          title: { type: "string" },
          amount: { type: "number", description: "Новая сумма в рублях" },
          clientName: { type: "string" },
          stage: {
            type: "string",
            enum: ["new", "negotiation", "won", "lost"],
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "addClientsBatch",
      description:
        "Добавить сразу несколько клиентов по конкретным данным: список из чата, таблица, вставка из Excel/CRM, перечень имён с телефонами. Ты сам извлекаешь поля из текста пользователя и передаёшь массив clients. Не используй для случайного «нагенерь тест» без имён — тогда seedDemoData. Не больше 40 записей за вызов.",
      parameters: {
        type: "object",
        properties: {
          clients: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                email: { type: "string" },
                phone: { type: "string" },
                company: { type: "string" },
                stage: {
                  type: "string",
                  enum: ["new", "contacted", "qualified", "won", "lost"],
                },
                createdAtISO: {
                  type: "string",
                  description:
                    "YYYY-MM-DD. «сегодня» = todayISO из JSON для каждой строки при запросе «на сегодня».",
                },
              },
              required: ["name"],
              additionalProperties: false,
            },
          },
        },
        required: ["clients"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "addDealsBatch",
      description:
        "Несколько сделок за один вызов по данным пользователя (список, таблица, перечень). Не больше 40 записей за вызов.",
      parameters: {
        type: "object",
        properties: {
          deals: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                amount: { type: "number", description: "Сумма в рублях" },
                clientName: { type: "string" },
                clientId: { type: "string", description: "id из clients в контексте" },
                stage: {
                  type: "string",
                  enum: ["new", "negotiation", "won", "lost"],
                },
                createdAtISO: {
                  type: "string",
                  description:
                    "YYYY-MM-DD. «сегодня» = todayISO из JSON для каждой строки, если пользователь так просил.",
                },
              },
              required: ["title", "amount"],
              additionalProperties: false,
            },
          },
        },
        required: ["deals"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "seedDemoData",
      description:
        "Только случайные тестовые клиенты и сделки (вымышленные имена, телефоны, суммы), когда пользователь просит «нагенерь демо», «заполни фейковыми», «штук 20 для теста» без своего списка. Если у него уже есть конкретные имена или таблица — addClientsBatch / addDealsBatch. Максимум 30 клиентов и 30 сделок за вызов.",
      parameters: {
        type: "object",
        properties: {
          clientCount: {
            type: "integer",
            description: "Сколько тестовых клиентов создать",
          },
          dealCount: {
            type: "integer",
            description: "Сколько тестовых сделок создать",
          },
        },
        required: ["clientCount", "dealCount"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "redistributeClientDatesAcrossWeek",
      description:
        "Перераспределить даты добавления всех клиентов по разным дням (демо). Вызывай, когда просят изменить даты клиентов, «размазать клиентов по неделе», обновить дату добавления в списке клиентов. Без этого вызова даты в CRM не меняются.",
      parameters: {
        type: "object",
        properties: {
          days: {
            type: "integer",
            description: "За сколько последних дней разложить (1–30), по умолчанию 7",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "redistributeDealDatesAcrossWeek",
      description:
        "Перераспределить даты создания всех сделок по разным дням (демо). Вызывай, когда просят размазать сделки по неделе по дате создания.",
      parameters: {
        type: "object",
        properties: {
          days: {
            type: "integer",
            description: "За сколько последних дней разложить (1–30), по умолчанию 7",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "spreadCreationTimesAcrossDays",
      description:
        "Универсально: перераспределить createdAt у сделок и/или клиентов. Если нужны только клиенты — предпочти redistributeClientDatesAcrossWeek; только сделки — redistributeDealDatesAcrossWeek.",
      parameters: {
        type: "object",
        properties: {
          scope: {
            type: "string",
            enum: ["deals", "clients", "both"],
            description:
              "Чьи даты переставить: только сделки, только клиенты или оба списка",
          },
          days: {
            type: "integer",
            description:
              "За сколько последних календарных дней равномерно разложить записи (1–30), по умолчанию 7",
          },
        },
        required: ["scope"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "showAnalytics",
      description:
        "Показать/построить блок аналитики на дашборде с метриками (выручка, воронка, количество клиентов/сделок).",
      parameters: {
        type: "object",
        properties: {
          metrics: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "highlight",
      description:
        "Подсветить блок интерфейса, чтобы обратить внимание пользователя.",
      parameters: {
        type: "object",
        properties: {
          target: {
            type: "string",
            enum: ["clients", "deals", "analytics"],
          },
        },
        required: ["target"],
        additionalProperties: false,
      },
    },
  },
] as const;
