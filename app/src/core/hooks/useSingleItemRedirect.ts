import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { usePermission } from '../PermissionContext'

interface UseSingleItemRedirectOptions {
  items: Array<{ uuid: string }>
  total: number
  loading: boolean
  managePermission: string
  buildDetailPath: (uuid: string) => string
  isFiltered: boolean
}

export function useSingleItemRedirect({
  items,
  total,
  loading,
  managePermission,
  buildDetailPath,
  isFiltered,
}: UseSingleItemRedirectOptions): { redirecting: boolean } {
  const navigate = useNavigate()
  const { can, loading: permLoading } = usePermission()
  const [redirecting, setRedirecting] = useState(false)
  const didRedirect = useRef(false)

  useEffect(() => {
    if (didRedirect.current || loading || permLoading || isFiltered) return
    if (total === 1 && items.length === 1 && !can(managePermission)) {
      didRedirect.current = true
      setRedirecting(true)
      navigate(buildDetailPath(items[0].uuid), { replace: true })
    }
  }, [loading, permLoading, total, items, isFiltered, can, managePermission, navigate, buildDetailPath])

  return { redirecting }
}
