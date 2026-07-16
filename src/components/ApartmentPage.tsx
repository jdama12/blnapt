import { useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { mountApartmentPrototype } from '../apartmentPrototype'
import { routePaths, type AppRoute } from '../routes'

type ApartmentPageProps = {
  route: AppRoute
}

export default function ApartmentPage({ route }: ApartmentPageProps) {
  const appRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const handleNavigate = useCallback(
    (nextRoute: AppRoute, options?: { replace?: boolean }) => {
      navigate(routePaths[nextRoute], { replace: options?.replace })
    },
    [navigate],
  )

  useEffect(() => {
    if (!appRef.current || !modalRef.current) return

    return mountApartmentPrototype(
      appRef.current,
      modalRef.current,
      route,
      handleNavigate,
    )
  }, [handleNavigate, route])

  return (
    <>
      <div ref={appRef} className="app-shell" />
      <div ref={modalRef} />
    </>
  )
}

