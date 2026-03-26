import { useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import WidgetWrapper from './WidgetWrapper'
import type { WidgetConfig, WidgetSize, WidgetHeight } from './useDashboard'

interface DashboardGridProps {
  widgets: WidgetConfig[]
  editMode: boolean
  onMove: (from: number, to: number) => void
  onRemove: (index: number) => void
  onResize: (index: number, size: WidgetSize) => void
  onResizeHeight: (index: number, height: WidgetHeight) => void
}

function gridItemClass(widget: WidgetConfig, extra?: string): string {
  const h = widget.height || 1
  let cls = `dashboard-grid-item dashboard-grid-item--${widget.size}`
  if (h > 1) cls += ` dashboard-grid-item--h${h}`
  if (extra) cls += ` ${extra}`
  return cls
}

function SortableWidget({
  widget,
  index,
  editMode,
  onRemove,
  onResize,
  onResizeHeight,
}: {
  widget: WidgetConfig
  index: number
  editMode: boolean
  onRemove: (index: number) => void
  onResize: (index: number, size: WidgetSize) => void
  onResizeHeight: (index: number, height: WidgetHeight) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `${widget.widget_id}-${index}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={gridItemClass(widget, isDragging ? 'dashboard-grid-item--dragging' : undefined)}
    >
      <WidgetWrapper
        widget={widget}
        editMode={editMode}
        dragAttributes={attributes}
        dragListeners={listeners}
        onRemove={() => onRemove(index)}
        onResize={(size) => onResize(index, size)}
        onResizeHeight={(height) => onResizeHeight(index, height)}
      />
    </div>
  )
}

export default function DashboardGrid({
  widgets,
  editMode,
  onMove,
  onRemove,
  onResize,
  onResizeHeight,
}: DashboardGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const items = widgets.map((w, i) => `${w.widget_id}-${i}`)
      const oldIndex = items.indexOf(active.id as string)
      const newIndex = items.indexOf(over.id as string)
      if (oldIndex !== -1 && newIndex !== -1) {
        onMove(oldIndex, newIndex)
      }
    },
    [widgets, onMove]
  )

  if (!editMode) {
    return (
      <div className="dashboard-grid">
        {widgets.map((widget, index) => (
          <div
            key={`${widget.widget_id}-${index}`}
            className={gridItemClass(widget)}
          >
            <WidgetWrapper
              widget={widget}
              editMode={false}
              onRemove={() => {}}
              onResize={() => {}}
              onResizeHeight={() => {}}
            />
          </div>
        ))}
      </div>
    )
  }

  const items = widgets.map((w, i) => `${w.widget_id}-${i}`)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={rectSortingStrategy}>
        <div className="dashboard-grid dashboard-grid--edit">
          {widgets.map((widget, index) => (
            <SortableWidget
              key={`${widget.widget_id}-${index}`}
              widget={widget}
              index={index}
              editMode={editMode}
              onRemove={onRemove}
              onResize={onResize}
              onResizeHeight={onResizeHeight}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
