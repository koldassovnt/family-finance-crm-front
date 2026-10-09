/**
 * Every user-facing string lives here, not inline in JSX. The UI is Russian
 * only and there is no i18n library — keeping them in one module means adding
 * a second language later is a swap, not a rewrite.
 */
export const strings = {
  appName: 'Семейные финансы',

  nav: {
    dashboard: 'Обзор',
    accounts: 'Счета',
    transactions: 'Операции',
    investments: 'Инвестиции',
    budgets: 'Бюджеты',
    goals: 'Цели',
    bills: 'Платежи',
    categories: 'Категории',
    topics: 'События',
    shared: 'Общий доступ',
    password: 'Смена пароля',
    users: 'Пользователи',
    logout: 'Выйти',
  },

  login: {
    title: 'Вход',
    email: 'Электронная почта',
    password: 'Пароль',
    submit: 'Войти',
    submitting: 'Вход…',
    invalidCredentials: 'Неверная почта или пароль',
  },

  common: {
    loading: 'Загрузка…',
    save: 'Сохранить',
    cancel: 'Отмена',
    delete: 'Удалить',
    edit: 'Изменить',
    add: 'Добавить',
    confirm: 'Подтвердить',
    retry: 'Повторить',
    /** Shown when a transaction points at a soft-deleted account. */
    deletedAccount: 'Удалённый счёт',
    /**
     * An account the *viewer* cannot resolve, which is not the same thing.
     * The other side of a transfer out of a shared account exists and is
     * healthy — it simply wasn't shared. «Удалённый счёт» would be a lie.
     */
    otherAccount: 'Другой счёт',
    /** Summary rows with no category. */
    uncategorized: 'Без категории',
    error: 'Не удалось выполнить запрос',
    empty: 'Пока ничего нет',
  },

  dashboard: {
    income: 'Доходы',
    expense: 'Расходы',
    net: 'Итого',
    spent: 'Потрачено',
    spendingByCategory: 'Расходы по категориям',
    noExpenses: 'В этом месяце расходов нет',
    expensesShare: 'Доля расходов',
    incomeByCategory: 'Доходы по категориям',
    incomeShare: 'Доля доходов',
    otherCategories: 'Прочее',
    total: 'Всего',
    accounts: 'Счета',
    budgets: 'Бюджеты за месяц',
    billsDue: 'Ближайшие платежи',
    nothingDue: 'Ничего не ожидается',
    allCaughtUp: 'Просроченных платежей нет',
  },

  categories: {
    title: 'Категории',
    add: 'Добавить категорию',
    addTitle: 'Новая категория',
    addChild: 'Добавить подкатегорию',
    editTitle: 'Изменить категорию',
    name: 'Название',
    kind: 'Тип',
    kinds: { EXPENSE: 'Расход', INCOME: 'Доход' },
    /** Fixed at creation — a category's kind decides where it can be used. */
    kindHint: 'Тип нельзя изменить после создания',
    parent: 'Родительская категория',
    noParent: 'Без родителя',
    created: 'Категория создана',
    updated: 'Категория изменена',
    deleted: 'Категория удалена',
    deleteTitle: 'Удалить категорию?',
    /** History keeps pointing at it; only new use is prevented. */
    deleteHint: 'Прошлые операции сохранят её название — она исчезнет только из списков выбора',
    /** Both blocks come back as 409. */
    blockedByChildren: 'Сначала удалите или перенесите подкатегории',
    blockedByBudget: 'Категорию использует активный бюджет',
    empty: 'Категорий пока нет',
  },

  password: {
    title: 'Смена пароля',
    current: 'Текущий пароль',
    next: 'Новый пароль',
    repeat: 'Повторите новый пароль',
    submit: 'Сменить пароль',
    mismatch: 'Пароли не совпадают',
    tooShort: 'Не меньше 8 символов',
    /** The change invalidates the token making the call. */
    hint: 'После смены пароля все сеансы завершатся — потребуется войти заново',
    done: 'Пароль изменён. Войдите заново',
  },

  users: {
    title: 'Пользователи',
    members: 'Участники семьи',
    add: 'Создать пользователя',
    email: 'Электронная почта',
    displayName: 'Имя',
    password: 'Пароль',
    /** The endpoint can only create MEMBER; OWNER is rejected. */
    roleHint: 'Новый пользователь получает роль «Член семьи»',
    created: 'Пользователь создан',
    /** Phase 8 opened `GET /users` to every member, so the list is real now. */
    roles: { OWNER: 'Владелец', MEMBER: 'Член семьи' },
    you: 'Это вы',
    /** Deleting a member is not implemented server-side — see the phase 8 spec. */
    noDelete: 'Удаление участников пока не поддерживается',
  },

  sharing: {
    /** The screen's own name — the tabs below it are «Доступно мне»/«Чем я делюсь». */
    title: 'Общий доступ',
    /** The action, on a resource you own. */
    share: 'Поделиться',
    shareTitle: 'Поделиться',
    incoming: 'Доступно мне',
    outgoing: 'Чем я делюсь',
    /** The read-only marker every viewed screen carries. */
    readOnly: 'Доступно для просмотра',
    owner: 'владелец',
    sharedWith: 'Есть доступ',
    addGrantee: 'Кому открыть доступ',
    /** The trigger's own text, distinct from the label above it. */
    pickMember: 'Выберите участника',
    revoke: 'Закрыть доступ',
    granted: 'Доступ открыт',
    revoked: 'Доступ закрыт',
    noGrantees: 'Пока никому не открыт',
    /** Every candidate is excluded: already shared, or yourself. */
    noCandidates: 'Больше некому открыть доступ',
    /** 409 — the pair already exists. */
    duplicate: 'Уже есть доступ',
    sharedAt: 'Открыт',
    open: 'Открыть',
    nothingIncoming: 'Вам пока ничего не открыли',
    nothingOutgoing: 'Вы пока ничем не делитесь',
    resourceTypes: {
      ACCOUNT: 'Счёт',
      GOAL: 'Цель',
      BUDGET: 'Бюджет',
      BILL: 'Платёж',
      TOPIC: 'Событие',
    },
    /** Plural headings for the «Доступно мне» groups. */
    resourceGroups: {
      ACCOUNT: 'Счета',
      GOAL: 'Цели',
      BUDGET: 'Бюджеты',
      BILL: 'Платежи',
      TOPIC: 'События',
    },
    /**
     * Said before the grant is made, per type, because "share my account"
     * sounds narrower than it is. Generic wording would under-describe the
     * widest cases — a topic carries transactions from accounts that were
     * never shared, and a goal hands over its linked account's balance.
     */
    disclosure: {
      ACCOUNT: 'Будет виден баланс и вся история операций: суммы, даты, заметки, категории и события.',
      GOAL: 'Будут видны цель и прогресс, а также название, валюта и баланс связанного счёта.',
      BUDGET: 'Будут видны категория, лимит и расход за любой месяц. Сами операции не видны.',
      BILL: 'Будет виден только сам платёж.',
      TOPIC: 'Будут видны итоги события и все прикреплённые операции — включая операции по счетам, к которым доступа нет.',
    },
    /** Names the account whose balance a shared goal discloses outright. */
    goalAccountWarning: (accountName: string) => `Будет виден баланс счёта «${accountName}»`,
    /** Nothing shared is ever added to the viewer's own figures. */
    notInTotals: 'Эти данные не входят в ваши итоги, бюджеты и обзор',
  },

  accounts: {
    title: 'Счета',
    balance: 'Баланс',
    type: 'Тип',
    bank: 'Банк',
    reconcile: 'Сверить баланс',
    reconcileTitle: 'Сверка баланса',
    actualBalance: 'Фактический баланс',
    currentBalance: 'Баланс в системе',
    difference: 'Разница',
    /** The adjustment is a ledger row, not a silent balance edit. */
    reconcileHint: 'Будет создана операция-корректировка на разницу',
    reconcileNoChange: 'Баланс уже совпадает — корректировка не нужна',
    reconciled: 'Баланс скорректирован',
    history: 'История операций',
    notFound: 'Счёт не найден',
    /** Negative is legal — a signal that something is missing, not an error. */
    negativeHint: 'Баланс отрицательный. Возможно, не внесена какая-то операция — сверьте баланс.',
    noBank: 'Без банка',
    /** Per currency only — balances in different currencies are never summed. */
    currencyTotal: (currency: string) => `Итого в ${currency}`,
    name: 'Название',
    currency: 'Валюта',
    openingBalance: 'Начальный баланс',
    addTitle: 'Новый счёт',
    add: 'Добавить счёт',
    editTitle: 'Изменить счёт',
    /** Only name and bank are patchable. */
    editHint: 'Тип, валюту и баланс изменить нельзя — баланс меняется операциями и сверкой',
    created: 'Счёт создан',
    updated: 'Счёт изменён',
    bankSearch: 'Найти или добавить банк',
    bankNotFound: 'Банк не найден',
    bankCreate: 'Добавить',
    types: {
      CASH: 'Наличные',
      BANK: 'Банковский счёт',
      DEPOSIT: 'Депозит',
      BROKER: 'Брокерский счёт',
      CRYPTO: 'Криптосчёт',
    },
  },

  transactions: {
    title: 'Операции',
    types: {
      INCOME: 'Доход',
      EXPENSE: 'Расход',
      TRANSFER: 'Перевод',
      ADJUSTMENT: 'Корректировка',
      TRADE: 'Сделка',
    },
    /** Deleting reverses the balance, so the dialog says so explicitly. */
    deleteWarning: 'Баланс счёта будет пересчитан. Отменить это действие нельзя.',
    from: 'С',
    to: 'По',
    account: 'Счёт',
    category: 'Категория',
    date: 'Дата',
    amount: 'Сумма',
    note: 'Заметка',
    allAccounts: 'Все счета',
    allCategories: 'Все категории',
    /** The API caps the window at a year and 400s past it. */
    rangeTooLong: 'Диапазон не может превышать один год',
    rangeInverted: 'Дата начала позже даты окончания',
    noneInRange: 'За выбранный период операций нет',
    addTitle: 'Новая операция',
    add: 'Добавить операцию',
    type: 'Тип',
    fromAccount: 'Счёт списания',
    toAccount: 'Счёт зачисления',
    toAmount: 'Сумма зачисления',
    exchangeRate: 'Курс к тенге',
    /** Shown under the rate input so the direction is unambiguous. */
    exchangeRateHint: 'Сколько тенге за 1 единицу валюты счёта',
    noCategory: 'Без категории',
    saved: 'Операция сохранена',
    editTitle: 'Изменить операцию',
    updated: 'Операция изменена',
    deleteTitle: 'Удалить операцию?',
    deleted: 'Операция удалена',
    /** Type and both accounts are immutable on PATCH. */
    immutableHint: 'Тип и счета изменить нельзя — удалите операцию и создайте заново',
    /** The two sides of a cross-currency transfer must travel together. */
    crossCurrencyHint: 'Обе суммы отправляются вместе, иначе стороны перевода разойдутся',
    errors: {
      amountPositive: 'Сумма должна быть больше нуля',
      amountInvalid: 'Введите сумму числом',
      accountRequired: 'Выберите счёт',
      toAccountRequired: 'Выберите счёт зачисления',
      toAccountSame: 'Счета должны быть разными',
      toAmountRequired: 'Укажите сумму зачисления — валюты счетов различаются',
      exchangeRateRequired: 'Укажите курс — счёт не в тенге',
      dateFuture: 'Дата не может быть в будущем',
      noteTooLong: 'Не больше 1000 символов',
    },
  },

  investments: {
    title: 'Инвестиции',
    /**
     * Two kinds of figure share this screen and must not blur: «Вложено» is
     * what was paid and always exists; «Стоимость» and «Прибыль» come from a
     * market price and exist only where there is one.
     */
    priceHint:
      'Текущая цена — цена закрытия дня. Активы без цены учитываются только по цене покупки.',
    currentPrice: 'Текущая цена',
    value: 'Стоимость',
    gain: 'Прибыль',
    totalValue: 'Текущая стоимость',
    /** Shown in place of a price, never 0 — KASE tickers are never priced. */
    noPrice: 'нет цены',
    priceAsOf: (date: string) => `на ${date}`,
    /**
     * A total's value and gain leave unpriced holdings out while its cost
     * does not, so the figure is partial and has to say so beside itself.
     */
    unpriced: (count: number) => `Без цены: ${count}`,
    unpricedHint: (count: number) =>
      `Без текущей цены: ${count}. Стоимость и прибыль посчитаны без них.`,
    refresh: 'Обновить цены',
    refreshed: (result: { updated: number; upToDate: number; failed: number; overBudget: number }) =>
      `Обновлено: ${result.updated} · уже актуальны: ${result.upToDate} · без ответа: ${result.failed} · отложено из-за лимита: ${result.overBudget}`,
    /** `configured: false` — the server has no price API key. */
    refreshNotConfigured: 'На сервере не настроен ключ для получения цен',
    /** Required by the provider's free plan. */
    attribution: 'Цены предоставлены API Ninjas',
    rename: 'Переименовать',
    renameTitle: 'Переименовать тикер',
    /** Every trade of it in the account, in one step. */
    renameHint: (ticker: string, account: string) =>
      `Тикер ${ticker} изменится во всех сделках на счёте «${account}». Цена появится после следующего обновления.`,
    renameTo: 'Новый тикер',
    renamed: 'Тикер переименован',
    /** 409 — a rename cannot merge two tickers. */
    renameConflict: 'Такой тикер уже есть на этом счёте — объединить два тикера нельзя',
    ticker: 'Тикер',
    quantity: 'Количество',
    unitPrice: 'Цена за единицу',
    averagePrice: 'Средняя цена покупки',
    cost: 'Вложено',
    totalCost: 'Всего вложено',
    /** Per currency, like account balances — the KZT figure sits beside it. */
    currencyCost: (currency: string) => `Вложено в ${currency}`,
    side: 'Вид сделки',
    /** OPENING is a position entered as already held, not a purchase. */
    sides: { BUY: 'Покупка', SELL: 'Продажа', OPENING: 'Ввод остатка' },
    tradeTotal: 'Сумма сделки',
    /** There is no asset-class field; the owner keeps it in the note. */
    noteHint: 'Укажите вид актива: акция, ETF, облигация, монета',
    addTrade: 'Новая сделка',
    addOpening: 'Добавить имеющийся актив',
    openingTitle: 'Имеющийся актив',
    /** The one thing that sets it apart from a purchase: no cash moves. */
    openingHint: 'Для активов, купленных до начала учёта. Деньги со счёта не списываются.',
    openingQuantity: 'Количество в наличии',
    openingDate: 'Дата покупки',
    openingSaved: 'Актив добавлен',
    holdings: 'Активы на счёте',
    empty: 'Активов пока нет',
    noAccounts: 'Сначала создайте брокерский счёт или криптосчёт',
    /** Side, type and account are immutable on PATCH. */
    immutableHint: 'Счёт и вид сделки изменить нельзя — удалите сделку и создайте заново',
    /** Deleting a trade reverses the cash and recomputes the position. */
    deleteWarning:
      'Баланс счёта и количество актива будут пересчитаны. Отменить это действие нельзя.',
    /** 409 on an edit or delete that would leave a ticker oversold. */
    oversold:
      'Тогда продано окажется больше, чем куплено. Сначала исправьте или удалите продажу.',
    errors: {
      tickerRequired: 'Укажите тикер',
      /** One per account kind; the format is what lets a price be found. */
      tickerCryptoFormat: (currency: string) =>
        `Запишите как МОНЕТА/${currency}, например TON/${currency}`,
      tickerCryptoCurrency: (currency: string) =>
        `Котировка должна быть в валюте счёта — ${currency}`,
      tickerExchange: (currency: string) =>
        `Для счёта в ${currency} укажите биржу через точку, например VEA.US`,
      tickerPlain: 'Для счёта в тенге — только тикер, например HSBK',
      tickerUnchanged: 'Новый тикер совпадает с текущим',
      quantityInvalid: 'Введите количество числом больше нуля',
      priceInvalid: 'Введите цену числом больше нуля',
      tooManyDecimals: 'Не больше 10 знаков после запятой',
      accountNotInvestment: 'Сделки доступны только на брокерском счёте и криптосчёте',
    },
  },

  budgets: {
    title: 'Бюджеты',
    limit: 'Лимит',
    spent: 'Потрачено',
    remaining: 'Остаток',
    /** An empty month is normal, not a missing-configuration state. */
    noneThisMonth: 'В этом месяце бюджетов не было',
    add: 'Добавить бюджет',
    addTitle: 'Новый бюджет',
    editTitle: 'Изменить бюджет',
    alertThreshold: 'Порог предупреждения, %',
    /** Nothing alerts — the threshold only colours the bar. */
    alertThresholdHint: 'Только цвет полосы — уведомления не отправляются',
    /** A limit change applies from the current month, leaving history intact. */
    editHint: 'Новый лимит действует с текущего месяца, прошлые месяцы сохранят прежний',
    deleteTitle: 'Удалить бюджет?',
    deleteHint: 'Бюджет перестанет действовать с текущего месяца, прошлые месяцы сохранят его',
    created: 'Бюджет создан',
    updated: 'Бюджет изменён',
    deleted: 'Бюджет удалён',
    duplicate: 'Для этой категории уже есть бюджет',
    usageVsLimit: 'Расход и лимит',
    /** Only EXPENSE categories can be budgeted. */
    expenseOnly: 'Бюджет можно завести только для категории расходов',
  },

  goals: {
    title: 'Цели',
    target: 'Цель',
    contribute: 'Пополнить',
    achieved: 'Достигнута',
    statuses: {
      ACTIVE: 'Активная',
      ABANDONED: 'Отменённая',
      ARCHIVED: 'В архиве',
    },
    types: {
      SAVINGS: 'Накопления',
      EMERGENCY_FUND: 'Подушка безопасности',
    },
    add: 'Добавить цель',
    addTitle: 'Новая цель',
    editTitle: 'Изменить цель',
    name: 'Название',
    targetAmount: 'Целевая сумма',
    targetDate: 'Срок',
    noTargetDate: 'Без срока',
    linkedAccount: 'Счёт',
    /** Fixed after creation: progress is measured against it. */
    linkedAccountHint: 'Счёт нельзя изменить после создания — прогресс считается по его балансу',
    status: 'Статус',
    showAll: 'Показать все',
    showActive: 'Только активные',
    onlyActiveEmpty: 'Активных целей нет',
    created: 'Цель создана',
    updated: 'Цель изменена',
    deleted: 'Цель удалена',
    deleteTitle: 'Удалить цель?',
    /** Progress is derived from the account balance, so nothing else is lost. */
    deleteHint: 'Операции по счёту останутся — удаляется только сама цель',
    /** Contributing is an ordinary transaction, not a separate endpoint. */
    contributeHint: 'Пополнение — обычный перевод на связанный счёт',
  },

  topics: {
    title: 'События',
    /** «Тема» is the literal translation but reads oddly for a trip. */
    one: 'Событие',
    add: 'Добавить событие',
    addTitle: 'Новое событие',
    editTitle: 'Изменить событие',
    name: 'Название',
    description: 'Описание',
    startDate: 'Начало',
    endDate: 'Окончание',
    plannedAmount: 'Планируемая сумма',
    /** Display only — nothing alerts and nothing blocks. */
    plannedHint: 'Только для сравнения — ограничений не накладывает',
    spent: 'Потрачено',
    received: 'Возвраты',
    net: 'Итого',
    remaining: 'Остаток',
    planned: 'План',
    transactionCount: 'Операций',
    /** The real span can start before the declared window. */
    actualSpan: 'Фактический период',
    declaredSpan: 'Заявленный период',
    noDates: 'Период не указан',
    statuses: { ACTIVE: 'Активное', CLOSED: 'Закрытое' },
    showAll: 'Показать все',
    showActive: 'Только активные',
    onlyActiveEmpty: 'Активных событий нет',
    created: 'Событие создано',
    updated: 'Событие изменено',
    deleted: 'Событие удалено',
    deleteTitle: 'Удалить событие?',
    /** A topic is a view; deleting it must not delete money. */
    deleteHint: 'Операции останутся в журнале — удаляется только само событие',
    duplicate: 'Событие с таким названием уже есть',
    attached: 'Операции добавлены',
    detached: 'Операция откреплена',
    detach: 'Открепить',
    attach: 'Добавить операции',
    attachTitle: 'Добавить операции в событие',
    /** Candidates are a suggestion, never an action. */
    candidatesHint: 'Показаны неприкреплённые операции за указанный период — проверьте каждую',
    candidatesNeedDates: 'Укажите даты события, чтобы подобрать операции',
    noCandidates: 'Подходящих операций нет',
    selected: 'Выбрано',
    noTransactions: 'В событии пока нет операций',
    noTopic: 'Без события',
    topicField: 'Событие',
    allTopics: 'Все события',
  },

  bills: {
    title: 'Платежи',
    dueDate: 'Срок',
    overdue: 'Просрочен',
    paid: 'Оплачен',
    markPaid: 'Отметить оплаченным',
    /** Marking paid does not create a transaction. */
    markPaidHint: 'Операция в журнале не создаётся — внесите её отдельно',
    unpaidPanel: 'К оплате',
    deleteSeries: 'Удалить всю серию',
    add: 'Добавить платёж',
    addTitle: 'Новый платёж',
    editTitle: 'Изменить платёж',
    batchAdd: 'Создать серию',
    batchTitle: 'Регулярный платёж',
    name: 'Название',
    amount: 'Сумма',
    currency: 'Валюта',
    dayOfMonth: 'День месяца',
    startMonth: 'С месяца',
    endMonth: 'По месяц',
    preview: 'Будет создано',
    /** Day 31 in a short month lands on its last day. */
    clampHint: 'В коротких месяцах дата переносится на последний день',
    tooManyRows: 'Слишком длинный период — не больше 120 платежей за раз',
    invalidRange: 'Начальный месяц позже конечного',
    created: 'Платёж создан',
    batchCreated: 'Серия создана',
    updated: 'Платёж изменён',
    deleted: 'Платёж удалён',
    seriesDeleted: 'Серия удалена',
    deleteTitle: 'Удалить платёж?',
    deleteSeriesTitle: 'Удалить всю серию?',
    deleteSeriesHint: 'Будут удалены все платежи, созданные вместе с этим',
    markUnpaid: 'Снять отметку',
    markedPaid: (name: string) => `«${name}» отмечен оплаченным`,
    calendar: 'Календарь',
    noneThisMonth: 'В этом месяце платежей нет',
    nothingUnpaid: 'Всё оплачено',
    nothingUnpaidThisMonth: 'В этом месяце платить нечего',
    weekdays: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  },
} as const
