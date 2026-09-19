import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { transactionsApi, type CreateTransactionBody } from '@/api/endpoints'
import type { Account, Category, Topic } from '@/api/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldSelect } from '@/components/FieldSelect'
import { parseMoney, todayInAlmaty } from '@/lib/format'
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
}

export function TransactionForm({
  open,
  onOpenChange,
  accounts,
  categories,
  topics = [],
  defaults,
}: TransactionFormProps) {
  const queryClient = useQueryClient()

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
      ...defaults,
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

  const source = accounts.find((account) => account.id === accountId)
  const destination = accounts.find((account) => account.id === toAccountId)

  const isTransfer = type === 'TRANSFER'
  const needsExchangeRate = source !== undefined && source.currency !== 'KZT'
  const needsToAmount =
    isTransfer &&
    source !== undefined &&
    destination !== undefined &&
    source.currency !== destination.currency

  // An EXPENSE needs an EXPENSE category and INCOME needs INCOME — a mismatch
  // is a data error, not a preference, so the picker never offers one.
  const selectableCategories = categories.filter(
    (category) => category.kind === (type === 'INCOME' ? 'INCOME' : 'EXPENSE'),
  )

  const mutation = useMutation({
    mutationFn: (values: TransactionFormOutput) => transactionsApi.create(toRequestBody(values)),
    onSuccess: () => {
      // A transaction moves balances and feeds every month-scoped total.
      for (const key of ['transactions', 'accounts', 'summary', 'budgets', 'goals']) {
        void queryClient.invalidateQueries({ queryKey: [key] })
      }
      toast.success(strings.transactions.saved)
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
          <DialogTitle>{strings.transactions.addTitle}</DialogTitle>
        </DialogHeader>

        <form
          noValidate
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          <Field label={strings.transactions.type} error={form.formState.errors.type?.message}>
            <FieldSelect
              value={type}
              onChange={(value) =>
                form.setValue('type', value as 'INCOME' | 'EXPENSE' | 'TRANSFER')
              }
              options={[
                { value: 'EXPENSE', label: strings.transactions.types.EXPENSE },
                { value: 'INCOME', label: strings.transactions.types.INCOME },
                { value: 'TRANSFER', label: strings.transactions.types.TRANSFER },
              ]}
            />
          </Field>

          <Field
            label={isTransfer ? strings.transactions.fromAccount : strings.transactions.account}
            error={form.formState.errors.accountId?.message}
          >
            <AccountSelect
              value={accountId}
              onChange={(value) => form.setValue('accountId', value)}
              accounts={accounts}
            />
          </Field>

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

          <Field
            label={`${strings.transactions.amount}${source === undefined ? '' : `, ${source.currency}`}`}
            error={form.formState.errors.amount?.message}
          >
            <Input inputMode="decimal" placeholder="0,00" {...form.register('amount')} />
          </Field>

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

          {/* A transfer carries no category at all and one is rejected. */}
          {!isTransfer && (
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
              would count both the withdrawal and the thing it paid for. */}
          {!isTransfer && (
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
            label={strings.transactions.date}
            error={form.formState.errors.occurredOn?.message}
          >
            {/* Capped at today in Almaty — a future date is rejected, since a
                transaction records what happened, not what is planned. */}
            <Input type="date" max={todayInAlmaty()} {...form.register('occurredOn')} />
          </Field>

          <Field label={strings.transactions.note} error={form.formState.errors.note?.message}>
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
function toRequestBody(values: TransactionFormOutput): CreateTransactionBody {
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
