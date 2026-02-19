import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>
  alert: (options: Omit<ConfirmOptions, 'cancelText'> | string) => Promise<void>
}

const ConfirmContext = createContext<ConfirmContextType | null>(null)

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context
}

interface ConfirmProviderProps {
  children: ReactNode
}

export function ConfirmProvider({ children }: ConfirmProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const [isAlert, setIsAlert] = useState(false)
  const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null)

  const confirm = useCallback((opts: ConfirmOptions | string): Promise<boolean> => {
    const normalizedOptions: ConfirmOptions = typeof opts === 'string'
      ? { message: opts }
      : opts

    setOptions(normalizedOptions)
    setIsAlert(false)
    setIsOpen(true)

    return new Promise((resolve) => {
      setResolveRef(() => resolve)
    })
  }, [])

  const alert = useCallback((opts: Omit<ConfirmOptions, 'cancelText'> | string): Promise<void> => {
    const normalizedOptions: ConfirmOptions = typeof opts === 'string'
      ? { message: opts }
      : opts

    setOptions(normalizedOptions)
    setIsAlert(true)
    setIsOpen(true)

    return new Promise((resolve) => {
      setResolveRef(() => () => resolve())
    })
  }, [])

  const handleConfirm = () => {
    setIsOpen(false)
    resolveRef?.(true)
    setResolveRef(null)
  }

  const handleCancel = () => {
    setIsOpen(false)
    resolveRef?.(false)
    setResolveRef(null)
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel()
    }
  }

  const variantClass = options?.variant || 'info'

  return (
    <ConfirmContext.Provider value={{ confirm, alert }}>
      {children}
      {isOpen && options && (
        <div className="modal-overlay" onClick={handleOverlayClick}>
          <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className={`confirm-modal-header confirm-modal-${variantClass}`}>
              {options.variant === 'danger' && (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              )}
              {options.variant === 'warning' && (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              )}
              {(!options.variant || options.variant === 'info') && (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
              )}
              <h3>{options.title || (isAlert ? 'Information' : 'Confirmation')}</h3>
            </div>
            <div className="confirm-modal-body">
              <p>{options.message}</p>
            </div>
            <div className="confirm-modal-footer">
              {!isAlert && (
                <button className="btn btn-secondary" onClick={handleCancel}>
                  {options.cancelText || 'Annuler'}
                </button>
              )}
              <button
                className={`btn ${variantClass === 'danger' ? 'btn-danger' : variantClass === 'warning' ? 'btn-warning' : 'btn-primary'}`}
                onClick={handleConfirm}
              >
                {options.confirmText || (isAlert ? 'OK' : 'Confirmer')}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
