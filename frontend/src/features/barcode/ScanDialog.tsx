import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { normalizeGtin } from '../../lib/gtin'

interface Props {
  open: boolean
  onClose: () => void
  /** Called with a valid GTIN barcode. */
  onCode: (barcode: string) => void
}

type CameraState = 'starting' | 'scanning' | 'unavailable'

/** Reads a barcode with the camera, from a photo, or typed in by hand. */
export function ScanDialog({ open, onClose, onCode }: Props) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Skanna streckkod</DialogTitle>
      {/* Mounted only while open, so the camera is released when the dialog closes. */}
      {open && <ScanContent onCode={onCode} />}
      <DialogActions>
        <Button onClick={onClose}>Avbryt</Button>
      </DialogActions>
    </Dialog>
  )
}

function ScanContent({ onCode }: { onCode: (barcode: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [camera, setCamera] = useState<CameraState>('starting')
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const [typedError, setTypedError] = useState<string | null>(null)

  // Live camera: look for a barcode a few times per second until one is found.
  useEffect(() => {
    let stream: MediaStream | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    let stopped = false

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamera('unavailable')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        })
        if (stopped || !videoRef.current) return
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCamera('scanning')
        const { readBarcode } = await import('./detector')
        const scan = async () => {
          if (stopped || !videoRef.current) return
          try {
            const code = await readBarcode(videoRef.current)
            if (code && !stopped) {
              onCode(code)
              return
            }
          } catch {
            // A frame that can't be read yet (e.g. video not ready); try the next one.
          }
          timer = setTimeout(scan, 250)
        }
        void scan()
      } catch {
        if (!stopped) setCamera('unavailable')
      }
    }

    void start()
    return () => {
      stopped = true
      clearTimeout(timer)
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [onCode])

  const readPhoto = async (file: File | undefined) => {
    if (!file) return
    setPhotoError(null)
    try {
      const { readBarcode } = await import('./detector')
      const code = await readBarcode(await createImageBitmap(file))
      if (code) onCode(code)
      else setPhotoError('Hittade ingen streckkod i bilden. Försök igen närmare och skarpare.')
    } catch {
      setPhotoError('Kunde inte läsa bilden.')
    }
  }

  const submitTyped = (event: FormEvent) => {
    event.preventDefault()
    const code = normalizeGtin(typed)
    if (code) onCode(code)
    else setTypedError('Ogiltig streckkod – kontrollera siffrorna.')
  }

  return (
    <DialogContent>
      <Stack spacing={2}>
        {camera !== 'unavailable' ? (
          <Box
            sx={{
              position: 'relative',
              borderRadius: 1,
              overflow: 'hidden',
              bgcolor: 'black',
              aspectRatio: '4 / 3',
            }}
          >
            <Box
              component="video"
              ref={videoRef}
              muted
              playsInline
              aria-label="Kamera"
              sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            {/* Aiming guide */}
            <Box
              sx={{
                position: 'absolute',
                inset: '35% 10%',
                border: 2,
                borderColor: 'rgba(255,255,255,0.8)',
                borderRadius: 1,
              }}
            />
            <Typography
              variant="body2"
              sx={{
                position: 'absolute',
                bottom: 8,
                width: '100%',
                textAlign: 'center',
                color: 'white',
              }}
            >
              {camera === 'starting' ? 'Startar kameran…' : 'Rikta kameran mot streckkoden'}
            </Typography>
          </Box>
        ) : (
          <Alert severity="info">
            Kameran går inte att använda här. Fota streckkoden eller skriv in siffrorna i stället.
          </Alert>
        )}

        <Button component="label" variant="outlined" startIcon={<PhotoCameraOutlinedIcon />}>
          Fota streckkoden
          <input
            hidden
            type="file"
            accept="image/*"
            capture="environment"
            aria-label="Fota streckkoden"
            onChange={(event) => void readPhoto(event.target.files?.[0])}
          />
        </Button>
        {photoError && <Alert severity="warning">{photoError}</Alert>}

        <Divider>eller</Divider>

        <Stack component="form" direction="row" spacing={1} onSubmit={submitTyped} noValidate>
          <TextField
            label="Streckkod"
            size="small"
            value={typed}
            onChange={(event) => {
              setTyped(event.target.value)
              setTypedError(null)
            }}
            error={!!typedError}
            helperText={typedError ?? 'Siffrorna under streckkoden'}
            slotProps={{ htmlInput: { inputMode: 'numeric', autoComplete: 'off' } }}
            sx={{ flexGrow: 1 }}
          />
          <Button type="submit" variant="contained" sx={{ alignSelf: 'flex-start', mt: '2px' }}>
            Sök
          </Button>
        </Stack>
      </Stack>
    </DialogContent>
  )
}
