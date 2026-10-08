import { useEffect, useState } from 'react'
import { AppLayout } from './AppLayout'
import { findNavigationItem, type NavigationItem } from './navigation'

export type AppRoute = NavigationItem

function usePathname() {
  const [pathname, setPathname] = useState(() => window.location.pathname)

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  return pathname
}

export function AppRouter() {
  const pathname = usePathname()
  const route = findNavigationItem(pathname)

  useEffect(() => {
    if (!route) {
      window.history.replaceState({}, '', '/cargar-datos')
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }, [route])

  return <AppLayout route={route ?? findNavigationItem('/cargar-datos')!} />
}

