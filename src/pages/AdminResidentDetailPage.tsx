import { useParams } from 'react-router-dom'
import ApartmentPage from '../components/ApartmentPage'

export default function AdminResidentDetailPage() {
  const { residentId } = useParams()
  return <ApartmentPage route="adminResidentDetail" residentId={residentId} />
}
