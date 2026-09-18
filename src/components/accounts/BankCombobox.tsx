import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { banksApi } from '@/api/endpoints'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { strings } from '@/strings'

/**
 * Banks are a shared, global lookup and `POST /banks` is find-or-create by
 * name — so the right control is a combobox that adds on the fly rather than
 * a select over an admin-provisioned list. Creating one that already exists
 * returns the existing row, so there is no duplicate to guard against.
 */
export function BankCombobox({
  value,
  onChange,
}: {
  value: string | null
  onChange: (bankId: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const queryClient = useQueryClient()

  const banks = useQuery({ queryKey: ['banks'], queryFn: banksApi.list })

  const create = useMutation({
    mutationFn: (name: string) => banksApi.findOrCreate(name),
    onSuccess: (bank) => {
      void queryClient.invalidateQueries({ queryKey: ['banks'] })
      onChange(bank.id)
      setSearch('')
      setOpen(false)
    },
  })

  const rows = banks.data ?? []
  const selected = rows.find((bank) => bank.id === value)
  const trimmed = search.trim()
  const canCreate =
    trimmed !== '' && !rows.some((bank) => bank.name.toLowerCase() === trimmed.toLowerCase())

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
            {selected?.name ?? strings.accounts.noBank}
          </Button>
        }
      />
      <PopoverContent className="w-(--anchor-width) p-0" align="start">
        <Command shouldFilter>
          <CommandInput
            placeholder={strings.accounts.bankSearch}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{strings.accounts.bankNotFound}</CommandEmpty>
            <CommandGroup>
              {/* Clearing is meaningful: a CASH account has no bank. */}
              <CommandItem
                value=""
                onSelect={() => {
                  onChange(null)
                  setOpen(false)
                }}
              >
                {strings.accounts.noBank}
              </CommandItem>
              {rows.map((bank) => (
                <CommandItem
                  key={bank.id}
                  value={bank.name}
                  onSelect={() => {
                    onChange(bank.id)
                    setOpen(false)
                  }}
                >
                  {bank.name}
                </CommandItem>
              ))}
              {canCreate && (
                <CommandItem
                  value={`__create__${trimmed}`}
                  disabled={create.isPending}
                  onSelect={() => create.mutate(trimmed)}
                >
                  {strings.accounts.bankCreate}: «{trimmed}»
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
