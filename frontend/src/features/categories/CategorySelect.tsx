import TextField, { type TextFieldProps } from '@mui/material/TextField'
import type { Category } from '../../api/client'

type Props = Omit<TextFieldProps, 'select' | 'children' | 'value' | 'onChange'> & {
  categories: Category[]
  value: string
  onChange: (value: string) => void
  /** Filter mode: top-level categories are selectable and an "all" option is shown. */
  allowTopLevel?: boolean
}

/**
 * A select over the two-level category tree. Uses the native select so phones show
 * their own picker.
 */
export function CategorySelect({ categories, value, onChange, allowTopLevel, ...props }: Props) {
  return (
    <TextField
      select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      {...props}
      slotProps={{
        ...props.slotProps,
        inputLabel: { shrink: true },
        select: { native: true },
      }}
    >
      {allowTopLevel ? (
        <>
          <option value="">Alla kategorier</option>
          {categories.map((top) => (
            <optgroup key={top.id} label={top.name}>
              <option value={String(top.id)}>Alla – {top.name}</option>
              {top.children.map((child) => (
                <option key={child.id} value={String(child.id)}>
                  {child.name}
                </option>
              ))}
            </optgroup>
          ))}
        </>
      ) : (
        <>
          <option value="" disabled>
            Välj kategori
          </option>
          {categories.map((top) => (
            <optgroup key={top.id} label={top.name}>
              {top.children.map((child) => (
                <option key={child.id} value={String(child.id)}>
                  {child.name}
                </option>
              ))}
            </optgroup>
          ))}
        </>
      )}
    </TextField>
  )
}
