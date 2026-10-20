"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface WidgetItem {
  id: string;
  size?: "sm" | "wide";
  label?: string;
  [key: string]: any;
}

interface DraggableWidgetGridProps<T extends WidgetItem = WidgetItem> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  onReorder?: (items: T[]) => void;
  className?: string;
}

export default function DraggableWidgetGrid<T extends WidgetItem = WidgetItem>({
  items: initialItems,
  renderItem,
  onReorder,
  className,
}: DraggableWidgetGridProps<T>) {
  const [items, setItems] = React.useState<T[]>(initialItems);
  const [draggedId, setDraggedId] = React.useState<string | null>(null);
  const [dragOverId, setDragOverId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);

    // Subtle ghost image adjustment
    if (e.currentTarget) {
      e.currentTarget.style.opacity = "0.75";
    }
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.currentTarget) {
      e.currentTarget.style.opacity = "1";
    }
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedId && draggedId !== targetId && dragOverId !== targetId) {
      setDragOverId(targetId);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const sourceIndex = items.findIndex((item) => item.id === draggedId);
    const targetIndex = items.findIndex((item) => item.id === targetId);

    if (sourceIndex !== -1 && targetIndex !== -1) {
      const updated = [...items];
      const [removed] = updated.splice(sourceIndex, 1);
      updated.splice(targetIndex, 0, removed);
      setItems(updated);
      onReorder?.(updated);
    }

    setDraggedId(null);
    setDragOverId(null);
  };

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 transition-all duration-300",
        className
      )}
    >
      {items.map((item) => {
        const isDragging = draggedId === item.id;
        const isDragOver = dragOverId === item.id;
        const isWide = item.size === "wide";

        return (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => handleDragStart(e, item.id)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, item.id)}
            onDrop={(e) => handleDrop(e, item.id)}
            className={cn(
              "group relative flex min-h-[170px] flex-col rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-all duration-300",
              "cursor-grab active:cursor-grabbing hover:border-foreground/30 hover:shadow-md",
              isWide ? "sm:col-span-2" : "col-span-1",
              isDragging && "scale-[1.02] rotate-[0.8deg] opacity-70 shadow-2xl ring-2 ring-primary/40 z-30",
              isDragOver && "ring-2 ring-blue-500/80 ring-offset-2 ring-offset-background scale-[0.98]"
            )}
            style={{
              touchAction: "manipulation",
            }}
          >
            {/* Tactical Grip Drag Indicator */}
            <div
              className="absolute top-3 right-3 z-20 flex size-6 items-center justify-center rounded-md opacity-0 transition-opacity group-hover:opacity-100 bg-muted/60 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
              title="Arraste para reposicionar o bloco"
              aria-label="Arrastar bloco"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="9" cy="6" r="1.2" />
                <circle cx="15" cy="6" r="1.2" />
                <circle cx="9" cy="12" r="1.2" />
                <circle cx="15" cy="12" r="1.2" />
                <circle cx="9" cy="18" r="1.2" />
                <circle cx="15" cy="18" r="1.2" />
              </svg>
            </div>

            {/* Widget Content */}
            <div className="flex-1 w-full h-full">{renderItem(item)}</div>
          </div>
        );
      })}
    </div>
  );
}
