import LocalBarIcon from '@mui/icons-material/LocalBar'
import LogoutIcon from '@mui/icons-material/Logout'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import Toolbar from '@mui/material/Toolbar'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { Outlet, Link as RouterLink, useLocation } from 'react-router'
import { useAuth } from '../auth/authContext'

const NAV = [
  { to: '/', label: 'Inventarie', isActive: (path: string) => !path.startsWith('/drinks') },
  { to: '/drinks', label: 'Drinkar', isActive: (path: string) => path.startsWith('/drinks') },
]

export function AppLayout() {
  const { session, logout } = useAuth()
  const { pathname } = useLocation()

  return (
    <>
      <AppBar position="sticky" color="primary" enableColorOnDark>
        <Toolbar>
          <Link
            component={RouterLink}
            to="/"
            color="inherit"
            underline="none"
            sx={{ display: 'flex', alignItems: 'center', mr: 2 }}
          >
            <LocalBarIcon sx={{ mr: 1 }} />
            {/* On phones the menu needs the space when signed in. */}
            <Typography
              variant="h6"
              component="span"
              sx={{ display: session ? { xs: 'none', sm: 'inline' } : 'inline' }}
            >
              Pourfolio
            </Typography>
          </Link>
          {session && (
            <Box component="nav" aria-label="Huvudmeny" sx={{ display: 'flex', gap: 0.5 }}>
              {NAV.map((item) => {
                const active = item.isActive(pathname)
                return (
                  <Button
                    key={item.to}
                    component={RouterLink}
                    to={item.to}
                    color="inherit"
                    aria-current={active ? 'page' : undefined}
                    sx={{
                      borderRadius: 0,
                      borderBottom: 2,
                      borderColor: active ? 'currentColor' : 'transparent',
                    }}
                  >
                    {item.label}
                  </Button>
                )
              })}
            </Box>
          )}
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
