import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'

function App() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Pourfolio
      </Typography>
      <Typography color="text.secondary">Ditt hembarsinventarie. Kommer snart.</Typography>
    </Container>
  )
}

export default App
