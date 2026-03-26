export type ExportFormat = 'xml' | 'excel' | 'csv' | 'json' | 'pdf'

export interface ExportParam {
  key: string
  type: 'api_select' | 'api_multi_select' | 'multi_year' | 'date_range'
  labelKey: string
  required?: boolean
  // For type 'api_select' | 'api_multi_select'
  endpoint?: string
  valueField?: string
  labelField?: string
  filterByScope?: boolean
  scopeFilterParam?: string
  // For type 'multi_year'
  yearRange?: [number, number]
}

export interface ExportDescriptor {
  id: string
  labelKey: string
  descriptionKey: string
  icon: string
  format: ExportFormat
  permission: string
  scopeType?: 'oc'
  endpoint: string
  responseType?: 'blob' | 'json'
  params?: ExportParam[]
}

export interface AvailableExport extends ExportDescriptor {
  featureName: string
  featureLabel?: string
}
