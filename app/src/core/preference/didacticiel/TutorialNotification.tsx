import { useLocation } from 'react-router-dom'
import { useTutorial } from './TutorialContext'
import './didacticiel.scss'

const BLOCKED_PATHS = ['/accept-legal', '/change-password']

export default function TutorialNotification() {
  const { pendingNewPermissions, startUnseenTutorials, dismissPending, active } =
    useTutorial()
  const location = useLocation()

  if (BLOCKED_PATHS.includes(location.pathname)) return null
  if (pendingNewPermissions.length === 0 || active) return null

  return (
    <div className="tutorial-notification">
      <div className="tutorial-notification__content">
        <span className="tutorial-notification__text">
          De nouveaux tutoriels sont disponibles
        </span>
        <div className="tutorial-notification__actions">
          <button
            className="btn btn-primary btn-sm"
            onClick={startUnseenTutorials}
            type="button"
          >
            Voir
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={dismissPending}
            type="button"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  )
}
