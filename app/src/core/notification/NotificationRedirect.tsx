import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../api'
import './notifications.scss'

export default function NotificationRedirect() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()

  useEffect(() => {
    if (!token) {
      navigate('/', { replace: true })
      return
    }
    api.patch(`/notifications/read-by-token/${token}`)
      .then(res => {
        const link = res.data?.link
        navigate(link || '/', { replace: true })
      })
      .catch(() => {
        navigate('/', { replace: true })
      })
  }, [token, navigate])

  return (
    <div className="notif-fullscreen-center">
      <div className="spinner" />
    </div>
  )
}
