import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderApp } from '../test/renderApp'
import { createFakeBackend, makeItem, server } from '../test/server'
import { PwaUpdatePrompt } from './PwaUpdatePrompt'

const sw = vi.hoisted(() => ({
  needRefresh: false,
  setNeedRefresh: vi.fn(),
  updateServiceWorker: vi.fn(() => Promise.resolve()),
}))

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [sw.needRefresh, sw.setNeedRefresh],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: sw.updateServiceWorker,
  }),
}))

function setOnline(online: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online)
  act(() => {
    window.dispatchEvent(new Event(online ? 'online' : 'offline'))
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  sw.needRefresh = false
})

describe('offline', () => {
  beforeEach(() => server.use(...createFakeBackend([makeItem()]).handlers))

  it('shows a notice while the device is offline', async () => {
    renderApp('/')
    await screen.findByRole('article', { name: 'Tanqueray London Dry' })
    expect(screen.queryByText(/Du är offline/)).not.toBeInTheDocument()

    setOnline(false)
    expect(screen.getByText(/Du är offline/)).toBeInTheDocument()

    setOnline(true)
    expect(screen.queryByText(/Du är offline/)).not.toBeInTheDocument()
  })
})

describe('signing out', () => {
  beforeEach(() => server.use(...createFakeBackend([makeItem()]).handlers))

  it('removes the cached API answers from the device', async () => {
    const remove = vi.fn(() => Promise.resolve(true))
    vi.stubGlobal('caches', { delete: remove })
    try {
      renderApp('/')
      await screen.findByRole('article', { name: 'Tanqueray London Dry' })

      await userEvent.setup().click(screen.getByRole('button', { name: 'Logga ut' }))

      await screen.findByRole('heading', { name: 'Logga in' })
      await waitFor(() => expect(remove).toHaveBeenCalledWith('api'))
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe('new version', () => {
  it('says nothing while the running version is the latest', () => {
    render(<PwaUpdatePrompt />)
    expect(screen.queryByText(/ny version/)).not.toBeInTheDocument()
  })

  it('reloads into the new version only when asked to', async () => {
    sw.needRefresh = true
    render(<PwaUpdatePrompt />)
    const user = userEvent.setup()

    expect(screen.getByText('Det finns en ny version av Pourfolio.')).toBeInTheDocument()
    expect(sw.updateServiceWorker).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Ladda om' }))
    expect(sw.updateServiceWorker).toHaveBeenCalled()
  })

  it('can be put off', async () => {
    sw.needRefresh = true
    render(<PwaUpdatePrompt />)

    await userEvent.setup().click(screen.getByRole('button', { name: 'Senare' }))
    expect(sw.setNeedRefresh).toHaveBeenCalledWith(false)
  })
})
