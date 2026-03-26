import { useState, useEffect, useCallback } from 'react'
import api from '../../api'

export type WidgetSize = 'quarter' | 'third' | 'half' | 'two-thirds' | 'full'
  | 'col-1' | 'col-2' | 'col-3' | 'col-4' | 'col-5' | 'col-6'
  | 'col-7' | 'col-8' | 'col-9' | 'col-10' | 'col-11' | 'col-12'
export type WidgetHeight = 1 | 2 | 3 | 4 | 5

export const SIZE_OPTIONS: WidgetSize[] = [
  'col-1', 'col-2', 'col-3', 'col-4', 'col-5', 'col-6',
  'col-7', 'col-8', 'col-9', 'col-10', 'col-11', 'col-12',
]
export const HEIGHT_OPTIONS: WidgetHeight[] = [1, 2, 3, 4, 5]

export interface WidgetConfig {
  widget_id: string
  position: number
  size: WidgetSize
  height?: WidgetHeight
  config?: Record<string, any> | null
}

export interface WidgetDefinition {
  id: string
  label: string
  description: string
  category: string
  default_size: string
  default_height: WidgetHeight
  data_endpoint: string | null
}

export interface LayoutState {
  widgets: WidgetConfig[]
  source: string
  full_width: boolean
}

export function useDashboard() {
  const [layout, setLayout] = useState<LayoutState | null>(null)
  const [availableWidgets, setAvailableWidgets] = useState<WidgetDefinition[]>([])
  const [editMode, setEditMode] = useState(false)
  const [editWidgets, setEditWidgets] = useState<WidgetConfig[]>([])
  const [fullWidth, setFullWidth] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadLayout = useCallback(async () => {
    try {
      const [layoutRes, widgetsRes] = await Promise.all([
        api.get('/dashboard/layout'),
        api.get('/dashboard/widgets'),
      ])
      setLayout(layoutRes.data)
      setFullWidth(layoutRes.data.full_width || false)
      setAvailableWidgets(widgetsRes.data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLayout()
  }, [loadLayout])

  const toggleFullWidth = useCallback(() => {
    setFullWidth(prev => !prev)
  }, [])

  const enterEditMode = useCallback(() => {
    if (layout) {
      setEditWidgets([...layout.widgets])
      setEditMode(true)
    }
  }, [layout])

  const cancelEdit = useCallback(() => {
    setEditMode(false)
    setEditWidgets([])
    setFullWidth(layout?.full_width || false)
  }, [layout])

  const moveWidget = useCallback((fromIndex: number, toIndex: number) => {
    setEditWidgets(prev => {
      const updated = [...prev]
      const [moved] = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, moved)
      return updated.map((w, i) => ({ ...w, position: i }))
    })
  }, [])

  const addWidget = useCallback((widgetId: string, size: WidgetSize, height: WidgetHeight = 1) => {
    setEditWidgets(prev => {
      const newWidget: WidgetConfig = {
        widget_id: widgetId,
        position: prev.length,
        size,
        height,
      }
      return [...prev, newWidget]
    })
  }, [])

  const removeWidget = useCallback((index: number) => {
    setEditWidgets(prev => {
      const updated = prev.filter((_, i) => i !== index)
      return updated.map((w, i) => ({ ...w, position: i }))
    })
  }, [])

  const resizeWidget = useCallback((index: number, size: WidgetSize) => {
    setEditWidgets(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], size }
      return updated
    })
  }, [])

  const resizeWidgetHeight = useCallback((index: number, height: WidgetHeight) => {
    setEditWidgets(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], height }
      return updated
    })
  }, [])

  const saveLayout = useCallback(async () => {
    setSaving(true)
    try {
      await api.put('/dashboard/layout', { widgets: editWidgets, full_width: fullWidth })
      setLayout({ widgets: editWidgets, source: 'user', full_width: fullWidth })
      setEditMode(false)
      setEditWidgets([])
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }, [editWidgets, fullWidth])

  const resetLayout = useCallback(async () => {
    setSaving(true)
    try {
      await api.delete('/dashboard/layout')
      await loadLayout()
      setEditMode(false)
      setEditWidgets([])
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }, [loadLayout])

  const activeWidgets = editMode ? editWidgets : (layout?.widgets || [])

  return {
    layout,
    activeWidgets,
    availableWidgets,
    editMode,
    fullWidth,
    loading,
    saving,
    enterEditMode,
    cancelEdit,
    toggleFullWidth,
    moveWidget,
    addWidget,
    removeWidget,
    resizeWidget,
    resizeWidgetHeight,
    saveLayout,
    resetLayout,
  }
}
