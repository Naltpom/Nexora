import { useState, useEffect, useCallback } from 'react'
import api from '../../api'

export interface WidgetConfig {
  widget_id: string
  position: number
  size: 'half' | 'full'
  config?: Record<string, any> | null
}

export interface WidgetDefinition {
  id: string
  label: string
  description: string
  category: string
  default_size: string
  data_endpoint: string | null
}

export interface LayoutState {
  widgets: WidgetConfig[]
  source: string
}

export function useDashboard() {
  const [layout, setLayout] = useState<LayoutState | null>(null)
  const [availableWidgets, setAvailableWidgets] = useState<WidgetDefinition[]>([])
  const [editMode, setEditMode] = useState(false)
  const [editWidgets, setEditWidgets] = useState<WidgetConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadLayout = useCallback(async () => {
    try {
      const [layoutRes, widgetsRes] = await Promise.all([
        api.get('/dashboard/layout'),
        api.get('/dashboard/widgets'),
      ])
      setLayout(layoutRes.data)
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

  const enterEditMode = useCallback(() => {
    if (layout) {
      setEditWidgets([...layout.widgets])
      setEditMode(true)
    }
  }, [layout])

  const cancelEdit = useCallback(() => {
    setEditMode(false)
    setEditWidgets([])
  }, [])

  const moveWidget = useCallback((fromIndex: number, toIndex: number) => {
    setEditWidgets(prev => {
      const updated = [...prev]
      const [moved] = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, moved)
      return updated.map((w, i) => ({ ...w, position: i }))
    })
  }, [])

  const addWidget = useCallback((widgetId: string, size: 'half' | 'full') => {
    setEditWidgets(prev => {
      const newWidget: WidgetConfig = {
        widget_id: widgetId,
        position: prev.length,
        size,
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

  const resizeWidget = useCallback((index: number, size: 'half' | 'full') => {
    setEditWidgets(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], size }
      return updated
    })
  }, [])

  const saveLayout = useCallback(async () => {
    setSaving(true)
    try {
      await api.put('/dashboard/layout', { widgets: editWidgets })
      setLayout({ widgets: editWidgets, source: 'user' })
      setEditMode(false)
      setEditWidgets([])
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }, [editWidgets])

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
    loading,
    saving,
    enterEditMode,
    cancelEdit,
    moveWidget,
    addWidget,
    removeWidget,
    resizeWidget,
    saveLayout,
    resetLayout,
  }
}
