import { useParams } from 'react-router-dom'
import ApartmentPage from '../components/ApartmentPage'

export default function AdminResidentDetailPage() {
  const { householdId } = useParams()
  return <ApartmentPage route="adminResidentDetail" householdId={householdId} />
}
