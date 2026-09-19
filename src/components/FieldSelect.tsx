import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface SelectOption {
  value: string
  label: string
}

/**
 * The only select this app uses.
 *
 * Base UI's `Select.Value` renders the raw **value**, not the chosen item's
 * text — so a select whose values are ids shows a UUID in the trigger, and one
 * whose values are enum members shows `EXPENSE`. The fix is the root's `items`
 * map, which is what `Value` consults for a label.
 *
 * Wrapping it here rather than passing `items` at a dozen call sites means the
 * label mapping is derived from the same options that render the list, so the
 * two cannot drift apart and a new select cannot forget it.
 */
export function FieldSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  className,
  disabled,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  disabled?: boolean
}) {
  const items = Object.fromEntries(options.map((option) => [option.value, option.label]))

  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => onChange(next ?? '')}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={className ?? 'w-full'}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
