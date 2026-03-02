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
import type { WidgetConfig } from './useDashboard'

interface DashboardGridProps {
  widgets: WidgetConfig[]
  editMode: boolean
  onMove: (from: number, to: number) => void
  onRemove: (index: number) => void
  onResize: (index: number, size: 'half' | 'full') => void
}

function SortableWidget({
  widget,
  index,
  editMode,
  onRemove,
  onResize,
}: {
  widget: WidgetConfig
  index: number
  editMode: boolean
  onRemove: (index: number) => void
  onResize: (index: number, size: 'half' | 'full') => void
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
      className={`dashboard-grid-item dashboard-grid-item--${widget.size}${isDragging ? ' dashboard-grid-item--dragging' : ''}`}
    >
      <WidgetWrapper
        widget={widget}
        editMode={editMode}
        dragAttributes={attributes}
        dragListeners={listeners}
        onRemove={() => onRemove(index)}
        onResize={(size) => onResize(index, size)}
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
            className={`dashboard-grid-item dashboard-grid-item--${widget.size}`}
          >
            <WidgetWrapper
              widget={widget}
              editMode={false}
              onRemove={() => {}}
              onResize={() => {}}
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
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
