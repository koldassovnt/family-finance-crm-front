import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import {
  marketDataApi,
  transactionsApi,
  type CreateTradeBody,
  type CreateTransactionBody,
} from '@/api/endpoints'
import type { Account, Category, Topic } from '@/api/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldSelect } from '@/components/FieldSelect'
import { isInvestmentAccount } from '@/lib/accounts'
import { formatMoneyWithCurrency, parseMoney, todayInAlmaty } from '@/lib/format'
import { suggestedRate } from '@/lib/rates'
import { tickerRule } from '@/lib/tickers'
import { strings } from '@/strings'
import {
  refineTransaction,
  transactionFormSchema,
  type TransactionFormOutput,
  type TransactionFormValues,
} from './transactionSchema'

const NO_CATEGORY = 'none'
const NO_TOPIC = 'none'

interface TransactionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: Account[]
  categories: Category[]
  /** ACTIVE topics only — a closed one should stop cluttering daily entry. */
  topics?: Topic[]
  /** Pre-fills the form — used by the goals page to contribute to a goal. */
  defaults?: Partial<TransactionFormValues>
  /**
   * Records a position that is already held instead of an ordinary operation.
   *
   * An OPENING is a trade to the API, but not to the person entering it: it
   * moves no cash, and it is how a portfolio that predates the app gets in at
   * all. Offered as a third side beside Buy and Sell it would read as one more
   * kind of deal, so it has its own entry point and this flag strips the form
   * down to it — no type, no side. Pass only investment accounts.
   */
  opening?: boolean
}

export function TransactionForm({
  open,
  onOpenChange,
  accounts,
  categories,
  topics = [],
  defaults,
  opening = false,
}: TransactionFormProps) {
  const queryClient = useQueryClient()

  // Stored server-side and refreshed daily, so reading them costs no call to
  // the price provider. Purely a convenience: the form works without them.
  const rates = useQuery({ queryKey: ['market-rates'], queryFn: marketDataApi.rates })

  const form = useForm<TransactionFormValues, unknown, TransactionFormOutput>({
    resolver: zodResolver(transactionFormSchema.superRefine(refineTransaction(accounts))),
    defaultValues: {
      type: 'EXPENSE',
      amount: '',
      accountId: '',
      toAccountId: '',
      toAmount: '',
      exchangeRate: '',
      categoryId: NO_CATEGORY,
      topicId: NO_TOPIC,
      occurredOn: todayInAlmaty(),
      note: '',
      tradeSide: 'BUY',
      ticker: '',
      quantity: '',
      unitPrice: '',
      ...defaults,
      ...(opening ? { type: 'TRADE', tradeSide: 'OPENING' } : {}),
    },
  })

  // useWatch rather than form.watch: the latter returns a fresh function
  // React Compiler cannot memoize, which risks stale values downstream.
  const control = form.control
  const type = useWatch({ control, name: 'type' })
  const accountId = useWatch({ control, name: 'accountId' })
  const toAccountId = useWatch({ control, name: 'toAccountId' })
  const categoryId = useWatch({ control, name: 'categoryId' })
  const topicId = useWatch({ control, name: 'topicId' })
  const tradeSide = useWatch({ control, name: 'tradeSide' })
  const quantity = useWatch({ control, name: 'quantity' })
  const unitPrice = useWatch({ control, name: 'unitPrice' })

  const source = accounts.find((account) => account.id === accountId)
  const destination = accounts.find((account) => account.id === toAccountId)

  const isTransfer = type === 'TRANSFER'
  const isTrade = type === 'TRADE'
  const isInvestment = source !== undefined && isInvestmentAccount(source.type)
  const currencySuffix = source === undefined ? '' : `, ${source.currency}`
  const needsExchangeRate = source !== undefined && source.currency !== 'KZT'
  const needsToAmount =
    isTransfer &&
    source !== undefined &&
    destination !== undefined &&
    source.currency !== destination.currency

  // Shown under the price so the cash a trade will move is visible before it
  // is saved. Display only — the server derives the amount itself and rejects
  // one that is sent. NaN while either input is unfinished, hence the `> 0`
  // guard where it is rendered.
  const tradeTotal = parseMoney(quantity ?? '') * parseMoney(unitPrice ?? '')

  // An EXPENSE needs an EXPENSE category and INCOME needs INCOME — a mismatch
  // is a data error, not a preference, so the picker never offers one.
  const selectableCategories = categories.filter(
    (category) => category.kind === (type === 'INCOME' ? 'INCOME' : 'EXPENSE'),
  )

  /**
   * The account decides which types are on offer, so choosing one can strand
   * the current type. A broker or crypto account takes only transfers and
   * trades — a frontend rule: the backend still accepts income and expense
   * there — and no other account can take a trade at all.
   */
  function selectAccount(value: string) {
    form.setValue('accountId', value)
    const next = accounts.find((account) => account.id === value)

    // Offer the latest stored rate for the new account's currency — but only
    // into a field the user has not made their own: empty, or still holding
    // the suggestion for the account they are leaving. A typed rate stays.
    const current = form.getValues('exchangeRate') ?? ''
    if (current === '' || current === suggestedRate(rates.data, source?.currency)) {
      form.setValue('exchangeRate', suggestedRate(rates.data, next?.currency))
    }

    const investment = next !== undefined && isInvestmentAccount(next.type)
    if (investment && (type === 'INCOME' || type === 'EXPENSE')) form.setValue('type', 'TRADE')
    if (!investment && type === 'TRADE') form.setValue('type', 'EXPENSE')
  }

  const typeOptions = isInvestment
    ? [
        { value: 'TRADE', label: strings.transactions.types.TRADE },
        { value: 'TRANSFER', label: strings.transactions.types.TRANSFER },
      ]
    : [
        { value: 'EXPENSE', label: strings.transactions.types.EXPENSE },
        { value: 'INCOME', label: strings.transactions.types.INCOME },
        { value: 'TRANSFER', label: strings.transactions.types.TRANSFER },
      ]

  const mutation = useMutation({
    mutationFn: (values: TransactionFormOutput) => transactionsApi.create(toRequestBody(values)),
    onSuccess: () => {
      // A transaction moves balances and feeds every month-scoped total; a
      // trade also changes what is held.
      for (const key of [
        'transactions',
        'account-transactions',
        'accounts',
        'summary',
        'budgets',
        'goals',
        'investments',
        'account-holdings',
      ]) {
        void queryClient.invalidateQueries({ queryKey: [key] })
      }
      toast.success(opening ? strings.investments.openingSaved : strings.transactions.saved)
      form.reset()
      onOpenChange(false)
    },
    onError: (error) => {
      if (error instanceof ApiError && error.hasFieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          form.setError(field as keyof TransactionFormValues, { message })
        }
        return
      }
      toast.error(error instanceof ApiError ? error.message : strings.common.error)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {opening ? strings.investments.openingTitle : strings.transactions.addTitle}
          </DialogTitle>
          {opening && <DialogDescription>{strings.investments.openingHint}</DialogDescription>}
        </DialogHeader>

        <form
          noValidate
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          {/* The account leads because it decides which types are offered. */}
          <Field
            label={isTransfer ? strings.transactions.fromAccount : strings.transactions.account}
            error={form.formState.errors.accountId?.message}
          >
            <AccountSelect value={accountId} onChange={selectAccount} accounts={accounts} />
          </Field>

          {!opening && (
            <Field label={strings.transactions.type} error={form.formState.errors.type?.message}>
              <FieldSelect
                value={type}
                onChange={(value) => form.setValue('type', value as TransactionFormValues['type'])}
                options={typeOptions}
              />
            </Field>
          )}

          {isTransfer && (
            <Field
              label={strings.transactions.toAccount}
              error={form.formState.errors.toAccountId?.message}
            >
              <AccountSelect
                value={toAccountId ?? ''}
                onChange={(value) => form.setValue('toAccountId', value)}
                accounts={accounts.filter((account) => account.id !== accountId)}
              />
            </Field>
          )}

          {/* A trade has no amount input: the server derives it as quantity ×
              price and answers 400 if one is sent. */}
          {!isTrade && (
            <Field
              label={`${strings.transactions.amount}${currencySuffix}`}
              error={form.formState.errors.amount?.message}
            >
              <Input inputMode="decimal" placeholder="0,00" {...form.register('amount')} />
            </Field>
          )}

          {isTrade && (
            <>
              {!opening && (
                <Field
                  label={strings.investments.side}
                  error={form.formState.errors.tradeSide?.message}
                >
                  <FieldSelect
                    value={tradeSide ?? 'BUY'}
                    onChange={(value) => form.setValue('tradeSide', value as 'BUY' | 'SELL')}
                    options={[
                      { value: 'BUY', label: strings.investments.sides.BUY },
                      { value: 'SELL', label: strings.investments.sides.SELL },
                    ]}
                  />
                </Field>
              )}

              <Field
                label={strings.investments.ticker}
                error={form.formState.errors.ticker?.message}
              >
                {/* Uppercased by the server; shown that way so the saved row
                    is no surprise. The placeholder is the format this account
                    expects, which differs by account type and currency. */}
                <Input
                  autoCapitalize="characters"
                  autoComplete="off"
                  maxLength={32}
                  className="uppercase"
                  placeholder={
                    source === undefined
                      ? undefined
                      : tickerRule(source.type, source.currency)?.example
                  }
                  {...form.register('ticker')}
                />
              </Field>

              {/* Fractional on purpose — a crypto position is rarely whole. */}
              <Field
                label={opening ? strings.investments.openingQuantity : strings.investments.quantity}
                error={form.formState.errors.quantity?.message}
              >
                <Input inputMode="decimal" placeholder="0" {...form.register('quantity')} />
              </Field>

              {/* Per unit in the account's currency: there is no instrument
                  currency, a EUR stock is bought from a EUR account. */}
              <Field
                label={`${opening ? strings.investments.averagePrice : strings.investments.unitPrice}${currencySuffix}`}
                error={form.formState.errors.unitPrice?.message}
                hint={
                  source !== undefined && tradeTotal > 0
                    ? `${strings.investments.tradeTotal}: ${formatMoneyWithCurrency(tradeTotal, source.currency)}`
                    : undefined
                }
              >
                <Input inputMode="decimal" placeholder="0,00" {...form.register('unitPrice')} />
              </Field>
            </>
          )}

          {/* Only when the currencies actually differ: sending it otherwise is
              a 400, not a harmless extra field. */}
          {needsToAmount && (
            <Field
              label={`${strings.transactions.toAmount}, ${destination?.currency}`}
              error={form.formState.errors.toAmount?.message}
            >
              <Input inputMode="decimal" placeholder="0,00" {...form.register('toAmount')} />
            </Field>
          )}

          {needsExchangeRate && (
            <Field
              label={strings.transactions.exchangeRate}
              error={form.formState.errors.exchangeRate?.message}
              hint={strings.transactions.exchangeRateHint}
            >
              <Input inputMode="decimal" placeholder="478,35" {...form.register('exchangeRate')} />
            </Field>
          )}

          {/* A transfer carries no category at all and one is rejected; the
              same goes for a trade. */}
          {!isTransfer && !isTrade && (
            <Field label={strings.transactions.category}>
              <FieldSelect
                value={categoryId ?? NO_CATEGORY}
                onChange={(value) => form.setValue('categoryId', value)}
                options={[
                  { value: NO_CATEGORY, label: strings.transactions.noCategory },
                  ...selectableCategories.map((category) => ({
                    value: category.id,
                    label: category.name,
                  })),
                ]}
              />
            </Field>
          )}

          {/* Same show/hide rule as the category picker: a TRANSFER or
              ADJUSTMENT cannot belong to a topic, since attaching a transfer
              would count both the withdrawal and the thing it paid for. A
              trade is rejected likewise — it is not spending. */}
          {!isTransfer && !isTrade && (
            <Field label={strings.topics.topicField}>
              <FieldSelect
                value={topicId ?? NO_TOPIC}
                onChange={(value) => form.setValue('topicId', value)}
                options={[
                  { value: NO_TOPIC, label: strings.topics.noTopic },
                  ...topics.map((topic) => ({ value: topic.id, label: topic.name })),
                ]}
              />
            </Field>
          )}

          <Field
            label={opening ? strings.investments.openingDate : strings.transactions.date}
            error={form.formState.errors.occurredOn?.message}
          >
            {/* Capped at today in Almaty — a future date is rejected, since a
                transaction records what happened, not what is planned. */}
            <Input type="date" max={todayInAlmaty()} {...form.register('occurredOn')} />
          </Field>

          <Field
            label={strings.transactions.note}
            error={form.formState.errors.note?.message}
            hint={isTrade ? strings.investments.noteHint : undefined}
          >
            <Input {...form.register('note')} />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {strings.common.cancel}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {strings.common.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Maps the form's strings onto the request, omitting what must not be sent. */
function toRequestBody(values: TransactionFormOutput): CreateTransactionBody | CreateTradeBody {
  if (values.type === 'TRADE') return toTradeBody(values)

  const body: CreateTransactionBody = {
    type: values.type,
    amount: values.amount,
    accountId: values.accountId,
    occurredOn: values.occurredOn,
  }

  if (values.type === 'TRANSFER') {
    body.toAccountId = values.toAccountId
  } else {
    if (values.categoryId !== undefined && values.categoryId !== NO_CATEGORY) {
      body.categoryId = values.categoryId
    }
    if (values.topicId !== undefined && values.topicId !== NO_TOPIC) {
      body.topicId = values.topicId
    }
  }

  const toAmount = parseMoney(values.toAmount ?? '')
  if (!Number.isNaN(toAmount) && toAmount > 0) body.toAmount = toAmount

  const exchangeRate = parseMoney(values.exchangeRate ?? '')
  if (!Number.isNaN(exchangeRate) && exchangeRate > 0) body.exchangeRate = exchangeRate

  if (values.note.trim() !== '') body.note = values.note.trim()

  return body
}

/**
 * A trade's body shares almost nothing with the others: no `amount`, no second
 * account, no category or topic — each of those is a 400 here, so they are
 * left out rather than sent empty.
 */
function toTradeBody(values: TransactionFormOutput): CreateTradeBody {
  const body: CreateTradeBody = {
    type: 'TRADE',
    accountId: values.accountId,
    tradeSide: values.tradeSide ?? 'BUY',
    ticker: (values.ticker ?? '').trim(),
    quantity: parseMoney(values.quantity ?? ''),
    unitPrice: parseMoney(values.unitPrice ?? ''),
    occurredOn: values.occurredOn,
  }

  const exchangeRate = parseMoney(values.exchangeRate ?? '')
  if (!Number.isNaN(exchangeRate) && exchangeRate > 0) body.exchangeRate = exchangeRate

  if (values.note.trim() !== '') body.note = values.note.trim()

  return body
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint !== undefined && error === undefined && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error !== undefined && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

function AccountSelect({
  value,
  onChange,
  accounts,
}: {
  value: string
  onChange: (value: string) => void
  accounts: Account[]
}) {
  return (
    <FieldSelect
      value={value}
      onChange={onChange}
      placeholder={strings.transactions.account}
      options={accounts.map((account) => ({
        value: account.id,
        label: `${account.name} · ${account.currency}`,
      }))}
    />
  )
}
