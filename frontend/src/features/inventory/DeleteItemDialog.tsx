import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import type { InventoryItem } from '../../api/client'
import { useNotify } from '../../components/notify'
import { useDeleteItem } from './useInventory'

interface Props {
  item: InventoryItem
  onClose: () => void
}

export function DeleteItemDialog({ item, onClose }: Props) {
  const deleteItem = useDeleteItem()
  const notify = useNotify()

  const confirm = () => {
    deleteItem.mutate(item.id, {
      onSuccess: () => {
        notify(`${item.name} har tagits bort`)
        onClose()
      },
      onError: () => notify('Kunde inte ta bort', 'error'),
    })
  }

  return (
    <Dialog open onClose={onClose}>
      <DialogTitle>Ta bort {item.name}?</DialogTitle>
      <DialogContent>
        <DialogContentText>Posten tas bort permanent och kan inte återställas.</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Avbryt</Button>
        <Button color="error" variant="contained" onClick={confirm} loading={deleteItem.isPending}>
          Ta bort
        </Button>
      </DialogActions>
    </Dialog>
  )
}
