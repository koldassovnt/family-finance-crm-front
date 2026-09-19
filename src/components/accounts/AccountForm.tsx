import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { accountsApi } from '@/api/endpoints'
import type { Account, AccountType } from '@/api/types'
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
import { parseMoney } from '@/lib/format'
import { strings } from '@/strings'
import { BankCombobox } from './BankCombobox'

const ACCOUNT_TYPES: AccountType[] = ['CASH', 'BANK', 'DEPOSIT', 'BROKER']

/**
 * Creating and editing an account are different shapes, so this handles both
 * rather than pretending they're one form: on create everything is settable;
 * on edit only name and bank are, because type, currency and balance are
 * fixed once the account exists. The balance moves only through transactions
 * and reconcile — editing it directly would break the rule that the ledger
 * always explains the balance.
 */
export function AccountForm({
  account,
  open,
  onOpenChange,
}: {
  /** Null creates; an account edits it. */
  account: Account | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const isEditing = account !== null

  const [name, setName] = useState(account?.name ?? '')
  const [type, setType] = useState<AccountType>(account?.type ?? 'BANK')
  const [currency, setCurrency] = useState(account?.currency ?? 'KZT')
  const [balance, setBalance] = useState(account === null ? '' : String(account.balance))
  const [bankId, setBankId] = useState<string | null>(account?.bank?.id ?? null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // A CASH account has no bank — the FK is nullable precisely for this.
  const supportsBank = type !== 'CASH'

  const mutation = useMutation({
    mutationFn: () => {
      if (isEditing) {
        return accountsApi.update(account.id, {
          name: name === account.name ? undefined : name,
          bankId: (account.bank?.id ?? null) === bankId ? undefined : bankId,
        })
      }
      return accountsApi.create({
        name,
        type,
        currency: currency.toUpperCase(),
        balance: parseMoney(balance) || 0,
        bankId: supportsBank ? bankId : null,
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
      toast.success(isEditing ? strings.accounts.updated : strings.accounts.created)
      onOpenChange(false)
    },
    onError: (error) => {
      if (error instanceof ApiError && error.hasFieldErrors) {
        setFieldErrors(error.fieldErrors)
        return
      }
      toast.error(error instanceof ApiError ? error.message : strings.common.error)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? strings.accounts.editTitle : strings.accounts.addTitle}
          </DialogTitle>
          {isEditing && <DialogDescription>{strings.accounts.editHint}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="account-name">{strings.accounts.name}</Label>
            <Input
              id="account-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            {fieldErrors.name !== undefined && (
              <p className="text-sm text-destructive">{fieldErrors.name}</p>
            )}
          </div>

          {/* Type, currency and opening balance are creation-only. */}
          {!isEditing && (
            <>
              <div className="space-y-1.5">
                <Label>{strings.accounts.type}</Label>
                <FieldSelect
                  value={type}
                  onChange={(value) => setType(value as AccountType)}
                  options={ACCOUNT_TYPES.map((accountType) => ({
                    value: accountType,
                    label: strings.accounts.types[accountType],
                  }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="account-currency">{strings.accounts.currency}</Label>
                  <Input
                    id="account-currency"
                    maxLength={3}
                    value={currency}
                    onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                  />
                  {fieldErrors.currency !== undefined && (
                    <p className="text-sm text-destructive">{fieldErrors.currency}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="account-balance">{strings.accounts.openingBalance}</Label>
                  <Input
                    id="account-balance"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={balance}
                    onChange={(event) => setBalance(event.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {supportsBank && (
            <div className="space-y-1.5">
              <Label>{strings.accounts.bank}</Label>
              <BankCombobox value={bankId} onChange={setBankId} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {strings.common.cancel}
          </Button>
          <Button
            type="button"
            disabled={name.trim() === '' || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {strings.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
