import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTutorial } from './TutorialContext'
import './didacticiel.scss'

const BLOCKED_PATHS = ['/accept-legal', '/change-password']

export default function TutorialNotification() {
  const { t } = useTranslation('preference.didacticiel')
  const {
    pendingNewPermissions,
    startUnseenTutorials,
    dismissPending,
    active,
    pendingResume,
    resumeTutorial,
    dismissResume,
  } = useTutorial()
  const location = useLocation()

  if (BLOCKED_PATHS.includes(location.pathname)) return null

  // Resume notification takes priority over new tutorials notification
  if (pendingResume && !active) {
    return (
      <div className="tutorial-notification">
        <div className="tutorial-notification__content">
          <span className="tutorial-notification__text">
            {t('tutorial_resume_text')}
          </span>
          <div className="tutorial-notification__actions">
            <button
              className="btn btn-primary btn-sm"
              onClick={resumeTutorial}
              type="button"
            >
              {t('tutorial_resume_yes')}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={dismissResume}
              type="button"
            >
              {t('tutorial_resume_no')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (pendingNewPermissions.length === 0 || active) return null

  return (
    <div className="tutorial-notification">
      <div className="tutorial-notification__content">
        <span className="tutorial-notification__text">
          {t('tutorial_notification_text')}
        </span>
        <div className="tutorial-notification__actions">
          <button
            className="btn btn-primary btn-sm"
            onClick={startUnseenTutorials}
            type="button"
          >
            {t('tutorial_notification_view')}
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={dismissPending}
            type="button"
          >
            {t('tutorial_notification_later')}
          </button>
        </div>
      </div>
    </div>
  )
}
