import LocalBarIcon from '@mui/icons-material/LocalBar'
import AppBar from '@mui/material/AppBar'
import Container from '@mui/material/Container'
import Link from '@mui/material/Link'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { Outlet, Link as RouterLink } from 'react-router'

export function AppLayout() {
  return (
    <>
      <AppBar position="sticky" color="primary" enableColorOnDark>
        <Toolbar>
          <LocalBarIcon sx={{ mr: 1 }} />
          <Link component={RouterLink} to="/" color="inherit" underline="none">
            <Typography variant="h6" component="span">
              Pourfolio
            </Typography>
          </Link>
        </Toolbar>
      </AppBar>
      <Container component="main" maxWidth="md" sx={{ py: 3 }}>
        <Outlet />
      </Container>
    </>
  )
}
