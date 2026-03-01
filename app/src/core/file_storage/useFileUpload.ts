import { useState, useRef, useCallback } from 'react'
import api from '../../api'
import type { UploadConfig, UploadProgress, StorageDocument } from './types'

interface UseFileUploadCallbacks {
  onSuccess?: (doc: StorageDocument) => void
  onError?: (clientId: string, error: string) => void
}

export function useFileUpload(config: UploadConfig, callbacks?: UseFileUploadCallbacks) {
  const [uploads, setUploads] = useState<UploadProgress[]>([])
  const abortControllers = useRef<Map<string, AbortController>>(new Map())

  const validate = useCallback((files: File[]): { valid: File[]; errors: { file: File; message: string }[] } => {
    const valid: File[] = []
    const errors: { file: File; message: string }[] = []

    for (const file of files) {
      if (config.accept && config.accept.length > 0) {
        const matches = config.accept.some((pattern) => {
          if (pattern.endsWith('/*')) {
            return file.type.startsWith(pattern.replace('/*', '/'))
          }
          return file.type === pattern
        })
        if (!matches) {
          errors.push({ file, message: 'error_type_not_allowed' })
          continue
        }
      }
      if (config.maxSizeBytes && file.size > config.maxSizeBytes) {
        errors.push({ file, message: 'error_file_too_large' })
        continue
      }
      valid.push(file)
    }

    if (config.maxFiles) {
      const currentCount = uploads.filter((u) => u.status === 'success').length
      const available = config.maxFiles - currentCount
      if (valid.length > available) {
        const excess = valid.splice(available)
        for (const file of excess) {
          errors.push({ file, message: 'error_max_files' })
        }
      }
    }

    return { valid, errors }
  }, [config, uploads])

  const uploadFile = useCallback(async (file: File, clientId: string) => {
    const controller = new AbortController()
    abortControllers.current.set(clientId, controller)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('resource_type', config.resourceType)
    if (config.resourceId != null) {
      formData.append('resource_id', String(config.resourceId))
    }
    if (config.category) {
      formData.append('category', config.category)
    }

    try {
      const res = await api.post<{ file: StorageDocument }>('/file-storage/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        signal: controller.signal,
        onUploadProgress: (event) => {
          if (event.total) {
            const progress = Math.round((event.loaded / event.total) * 100)
            setUploads((prev) =>
              prev.map((u) => (u.clientId === clientId ? { ...u, progress, status: 'uploading' } : u))
            )
          }
        },
      })

      const doc = res.data.file
      setUploads((prev) =>
        prev.map((u) =>
          u.clientId === clientId ? { ...u, status: 'success', progress: 100, result: doc } : u
        )
      )
      callbacks?.onSuccess?.(doc)
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'ERR_CANCELED') return

      let message = 'error_upload_failed'
      const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } }
      if (axiosErr.response) {
        if (axiosErr.response.status === 413) message = 'error_file_too_large'
        else if (axiosErr.response.status === 507) message = 'error_quota_exceeded'
        else if (axiosErr.response.data?.detail) message = axiosErr.response.data.detail
      } else {
        message = 'error_network'
      }

      setUploads((prev) =>
        prev.map((u) => (u.clientId === clientId ? { ...u, status: 'error', error: message } : u))
      )
      callbacks?.onError?.(clientId, message)
    } finally {
      abortControllers.current.delete(clientId)
    }
  }, [config, callbacks])

  const upload = useCallback(async (files: File[]) => {
    const newUploads: UploadProgress[] = files.map((file) => ({
      clientId: crypto.randomUUID(),
      file,
      status: 'pending' as const,
      progress: 0,
      error: null,
      result: null,
    }))

    setUploads((prev) => [...prev, ...newUploads])

    for (const item of newUploads) {
      await uploadFile(item.file, item.clientId)
    }
  }, [uploadFile])

  const cancel = useCallback((clientId: string) => {
    const controller = abortControllers.current.get(clientId)
    if (controller) {
      controller.abort()
      abortControllers.current.delete(clientId)
    }
    setUploads((prev) => prev.filter((u) => u.clientId !== clientId))
  }, [])

  const cancelAll = useCallback(() => {
    abortControllers.current.forEach((controller) => controller.abort())
    abortControllers.current.clear()
    setUploads([])
  }, [])

  const dismiss = useCallback((clientId: string) => {
    setUploads((prev) => prev.filter((u) => u.clientId !== clientId))
  }, [])

  const retry = useCallback(async (clientId: string) => {
    const item = uploads.find((u) => u.clientId === clientId)
    if (!item) return

    setUploads((prev) =>
      prev.map((u) =>
        u.clientId === clientId ? { ...u, status: 'pending', progress: 0, error: null } : u
      )
    )

    await uploadFile(item.file, clientId)
  }, [uploads, uploadFile])

  const isUploading = uploads.some((u) => u.status === 'uploading' || u.status === 'pending')

  const totalProgress = uploads.length === 0
    ? 0
    : Math.round(uploads.reduce((sum, u) => sum + u.progress, 0) / uploads.length)

  return {
    uploads,
    validate,
    upload,
    cancel,
    cancelAll,
    dismiss,
    retry,
    isUploading,
    totalProgress,
    setUploads,
  }
}
