import { useEffect, useRef } from 'react'
import { mountApartmentPrototype } from './apartmentPrototype'

function App() {
  const appRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!appRef.current || !modalRef.current) return

    return mountApartmentPrototype(appRef.current, modalRef.current)
  }, [])

  return (
    <>
      <div ref={appRef} className="app-shell" />
      <div ref={modalRef} />
      <div id="toast" className="toast" role="status" aria-live="polite" />
    </>
  )
}

export default App
