import React from 'react'
import { withTranslation, WithTranslation } from 'react-i18next'

interface ErrorBoundaryState {
  hasError: boolean
}

class ErrorBoundaryClass extends React.Component<
  React.PropsWithChildren<WithTranslation>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<WithTranslation>) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary]', error, errorInfo)
  }

  handleReload = (): void => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      const { t } = this.props

      return (
        <div className="error-boundary-container">
          <div className="error-boundary-card">
            <div className="error-boundary-icon">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 2L1 21h22L12 2z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <line
                  x1="12"
                  y1="9"
                  x2="12"
                  y2="15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="18" r="1" fill="currentColor" />
              </svg>
            </div>
            <h1 className="error-boundary-title">
              {t('error_boundary_title')}
            </h1>
            <p className="error-boundary-description">
              {t('error_boundary_description')}
            </p>
            <button
              className="btn btn-primary"
              onClick={this.handleReload}
            >
              {t('error_boundary_reload')}
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

const ErrorBoundary = withTranslation('common')(ErrorBoundaryClass)
export default ErrorBoundary
