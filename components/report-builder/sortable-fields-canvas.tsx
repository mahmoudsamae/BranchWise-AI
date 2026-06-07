"use client";

import { useMemo, type DragEvent } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { FieldType, TemplateField } from "@/lib/report-builder/template-fields";

import { TemplateFieldRow } from "./template-field-row";

function SortableFieldItem({
  field,
  index,
  onChange,
  onRemove,
  onPaletteDrop,
}: {
  field: TemplateField;
  index: number;
  onChange: (next: TemplateField) => void;
  onRemove: () => void;
  onPaletteDrop: (e: DragEvent, dropIndex: number) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TemplateFieldRow
        field={field}
        index={index}
        onChange={onChange}
        onRemove={onRemove}
        dragHandleRef={setActivatorNodeRef}
        dragHandleProps={{ ...attributes, ...listeners }}
        onRowDrop={(e) => onPaletteDrop(e, index)}
      />
    </div>
  );
}

export function SortableFieldsCanvas({
  fields,
  onFieldsChange,
  onPaletteDropAtIndex,
  onPaletteDropAppend,
  isFieldType,
}: {
  fields: TemplateField[];
  onFieldsChange: (next: TemplateField[]) => void;
  onPaletteDropAtIndex: (e: DragEvent, dropIndex: number, isFieldType: (v: string) => v is FieldType) => void;
  onPaletteDropAppend: (e: DragEvent, isFieldType: (v: string) => v is FieldType) => void;
  isFieldType: (v: string) => v is FieldType;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const fieldIds = useMemo(() => fields.map((f) => f.id), [fields]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = fields.findIndex((f) => f.id === active.id);
    const newIndex = fields.findIndex((f) => f.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onFieldsChange(arrayMove(fields, oldIndex, newIndex));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-3">
          {fields.map((f, i) => (
            <SortableFieldItem
              key={f.id}
              field={f}
              index={i}
              onChange={(next) => onFieldsChange(fields.map((x) => (x.id === f.id ? next : x)))}
              onRemove={() => onFieldsChange(fields.filter((x) => x.id !== f.id))}
              onPaletteDrop={(e, dropIndex) => onPaletteDropAtIndex(e, dropIndex, isFieldType)}
            />
          ))}
        </div>
      </SortableContext>
      {fields.length > 0 ? (
        <div
          className="mt-3 rounded-lg border border-dashed border-[#374151] py-3 text-center text-xs text-[#6b7280]"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }}
          onDrop={(e) => {
            e.preventDefault();
            onPaletteDropAppend(e, isFieldType);
          }}
        >
          Drop palette field here to append
        </div>
      ) : null}
    </DndContext>
  );
}
