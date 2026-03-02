"use client";

import { ReactNode } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DraggableProvided,
  DroppableProvided,
} from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";

export interface KanbanColumn {
  id: string;
  title: string;
  color: string;
}

export interface KanbanItem {
  id: string;
  columnId: string;
  content: ReactNode;
}

interface KanbanBoardProps {
  columns: KanbanColumn[];
  items: KanbanItem[];
  onMove: (itemId: string, sourceColumnId: string, destinationColumnId: string) => void;
  className?: string;
}

const columnColorClasses: Record<string, string> = {
  gray: "bg-gray-100 border-gray-300",
  blue: "bg-blue-100 border-blue-300",
  purple: "bg-purple-100 border-purple-300",
  yellow: "bg-yellow-100 border-yellow-300",
  orange: "bg-orange-100 border-orange-300",
  red: "bg-red-100 border-red-300",
  green: "bg-green-100 border-green-300",
};

const headerColorClasses: Record<string, string> = {
  gray: "bg-gray-200 text-gray-800",
  blue: "bg-blue-200 text-blue-800",
  purple: "bg-purple-200 text-purple-800",
  yellow: "bg-yellow-200 text-yellow-800",
  orange: "bg-orange-200 text-orange-800",
  red: "bg-red-200 text-red-800",
  green: "bg-green-200 text-green-800",
};

export function KanbanBoard({ columns, items, onMove, className }: KanbanBoardProps) {
  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    onMove(draggableId, source.droppableId, destination.droppableId);
  };

  const getColumnItems = (columnId: string) => {
    return items.filter((item) => item.columnId === columnId);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div
        className={cn(
          "flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-16rem)]",
          "md:flex-row flex-col md:overflow-x-auto overflow-x-hidden",
          className
        )}
      >
        {columns.map((column) => {
          const columnItems = getColumnItems(column.id);
          const colorClass = columnColorClasses[column.color] || columnColorClasses.gray;
          const headerClass = headerColorClasses[column.color] || headerColorClasses.gray;

          return (
            <div
              key={column.id}
              className={cn(
                "flex-shrink-0 w-full md:w-72 rounded-lg border",
                colorClass
              )}
            >
              <div
                className={cn(
                  "px-3 py-2 rounded-t-lg font-medium text-sm flex items-center justify-between",
                  headerClass
                )}
              >
                <span>{column.title}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/50">
                  {columnItems.length}
                </span>
              </div>
              <Droppable droppableId={column.id}>
                {(provided: DroppableProvided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "p-2 min-h-[200px] space-y-2 transition-colors",
                      snapshot.isDraggingOver && "bg-black/5"
                    )}
                  >
                    {columnItems.map((item, index) => (
                      <Draggable key={item.id} draggableId={item.id} index={index}>
                        {(provided: DraggableProvided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={cn(
                              "transition-shadow",
                              snapshot.isDragging && "shadow-lg"
                            )}
                          >
                            {item.content}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
