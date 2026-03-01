export type UploadStatus = 'pending' | 'uploading' | 'success' | 'error'
export type ScanStatus = 'pending' | 'clean' | 'infected' | 'skipped' | 'error'
export type ModerationStatus = 'pending' | 'approved' | 'rejected'

export interface StorageDocument {
  id: number
  uuid: string
  original_filename: string
  mime_type: string
  extension: string
  size_bytes: number
  category: string
  resource_type: string
  resource_id: number | null
  has_thumbnail: boolean
  is_public: boolean
  scan_status: ScanStatus
  scan_result: string | null
  status: ModerationStatus
  moderated_by_id: number | null
  moderated_at: string | null
  uploaded_by: number
  uploader_name?: string
  created_at: string
}

export interface UploadConfig {
  accept?: string[]
  maxSizeBytes?: number
  maxFiles?: number
  resourceType: string
  resourceId?: number | null
  category?: string
}

export interface UploadProgress {
  clientId: string
  file: File
  status: UploadStatus
  progress: number
  error: string | null
  result: StorageDocument | null
}

export interface QuotaInfo {
  used_bytes: number
  max_bytes: number
  file_count: number
}

export interface FileStoragePolicy {
  resource_type: string
  requires_moderation: boolean
  updated_at: string
  updated_by_id: number | null
}
