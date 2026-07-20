import { useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { mountApartmentPrototype } from '../apartmentPrototype'
import { routePaths, type AppRoute } from '../routes'

type ApartmentPageProps = {
  route: AppRoute
  householdId?: string
}

export default function ApartmentPage({ route, householdId }: ApartmentPageProps) {
  const appRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const handleNavigate = useCallback(
    (nextRoute: AppRoute, options?: { replace?: boolean; householdId?: string }) => {
      const path = nextRoute === 'adminResidentDetail' && options?.householdId
        ? `${routePaths.adminResidentDetail}/${options.householdId}`
        : routePaths[nextRoute]
      navigate(path, { replace: options?.replace })
    },
    [navigate],
  )

  useEffect(() => {
    if (!appRef.current || !modalRef.current) return

    return mountApartmentPrototype(
      appRef.current,
      modalRef.current,
      route,
      householdId,
      handleNavigate,
    )
  }, [handleNavigate, householdId, route])

  return (
    <>
      <div ref={appRef} className="app-shell" />
      <div ref={modalRef} />
    </>
  )
}

