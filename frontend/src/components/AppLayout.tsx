import LocalBarIcon from '@mui/icons-material/LocalBar'
import LogoutIcon from '@mui/icons-material/Logout'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import Toolbar from '@mui/material/Toolbar'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { Outlet, Link as RouterLink } from 'react-router'
import { useAuth } from '../auth/authContext'

export function AppLayout() {
  const { session, logout } = useAuth()

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
          <Box sx={{ flexGrow: 1 }} />
          {session && (
            <Tooltip title="Logga ut">
              <IconButton color="inherit" edge="end" aria-label="Logga ut" onClick={logout}>
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          )}
        </Toolbar>
      </AppBar>
      <Container component="main" maxWidth="md" sx={{ py: 3 }}>
        <Outlet />
      </Container>
    </>
  )
}
