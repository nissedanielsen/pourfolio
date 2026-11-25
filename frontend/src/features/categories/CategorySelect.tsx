import ListSubheader from '@mui/material/ListSubheader'
import MenuItem from '@mui/material/MenuItem'
import TextField, { type TextFieldProps } from '@mui/material/TextField'
import type { Category } from '../../api/client'

type Props = Omit<TextFieldProps, 'select' | 'children' | 'value' | 'onChange'> & {
  categories: Category[]
  value: string
  onChange: (value: string) => void
  /** Filter mode: top-level categories are selectable and an "all" option is shown. */
  allowTopLevel?: boolean
}

/** A select over the two-level category tree, grouped by top-level category. */
export function CategorySelect({ categories, value, onChange, allowTopLevel, ...props }: Props) {
  const options = categories.flatMap((top) => [
    allowTopLevel ? (
      <MenuItem key={top.id} value={String(top.id)} sx={{ fontWeight: 600 }}>
        {top.name}
      </MenuItem>
    ) : (
      <ListSubheader key={top.id}>{top.name}</ListSubheader>
    ),
    ...top.children.map((child) => (
      <MenuItem key={child.id} value={String(child.id)} sx={{ pl: 4 }}>
        {child.name}
      </MenuItem>
    )),
  ])

  return (
    <TextField
      select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      {...props}
      slotProps={{
        ...props.slotProps,
        inputLabel: allowTopLevel ? { shrink: true } : undefined,
        select: { displayEmpty: allowTopLevel, MenuProps: { sx: { maxHeight: 480 } } },
      }}
    >
      {allowTopLevel && <MenuItem value="">Alla kategorier</MenuItem>}
      {options}
    </TextField>
  )
}
