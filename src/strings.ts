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
    budgets: 'Бюджеты',
    goals: 'Цели',
    bills: 'Платежи',
    categories: 'Категории',
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
    accounts: 'Счета',
    budgets: 'Бюджеты за месяц',
    billsDue: 'Ближайшие платежи',
    nothingDue: 'Ничего не ожидается',
    allCaughtUp: 'Просроченных платежей нет',
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
    },
  },

  transactions: {
    title: 'Операции',
    types: {
      INCOME: 'Доход',
      EXPENSE: 'Расход',
      TRANSFER: 'Перевод',
      ADJUSTMENT: 'Корректировка',
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

  budgets: {
    title: 'Бюджеты',
    limit: 'Лимит',
    spent: 'Потрачено',
    remaining: 'Остаток',
    /** An empty month is normal, not a missing-configuration state. */
    noneThisMonth: 'В этом месяце бюджетов не было',
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
  },
} as const
