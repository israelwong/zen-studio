'use client';

import React, { useState } from 'react';
import { CheckCircle2, Circle, Plus } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardContent, ZenButton } from '@/components/ui/zen';

interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
}

interface EventTodoCardProps {
  studioSlug: string;
  eventId: string;
}

export function EventTodoCard({ studioSlug, eventId }: EventTodoCardProps) {
  // Datos hardcodeados de ejemplo
  const [todos, setTodos] = useState<TodoItem[]>([
    { id: '1', title: 'Confirmar menú con el cliente', completed: false },
    { id: '2', title: 'Enviar cronograma al equipo', completed: true },
    { id: '3', title: 'Verificar permisos de locación', completed: false },
    { id: '4', title: 'Confirmar pago de anticipo', completed: true },
    { id: '5', title: 'Revisar equipo técnico', completed: false },
  ]);

  const handleToggle = (id: string) => {
    setTodos(prev => prev.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const completedCount = todos.filter(t => t.completed).length;

  return (
    <ZenCard variant="default" padding="none">
      <ZenCardHeader className="border-b border-zinc-800 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <ZenCardTitle className="text-base">Tareas</ZenCardTitle>
            <p className="text-xs text-zinc-500 mt-1">
              {completedCount} de {todos.length} completadas
            </p>
          </div>
          <ZenButton
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            disabled
          >
            <Plus className="h-4 w-4" />
          </ZenButton>
        </div>
      </ZenCardHeader>

      <ZenCardContent className="p-4">
        <div className="space-y-2">
          {todos.map((todo) => (
            <div
              key={todo.id}
              className="flex items-start gap-3 p-2 rounded hover:bg-zinc-900/50 transition-colors cursor-pointer"
              onClick={() => handleToggle(todo.id)}
            >
              {todo.completed ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              ) : (
                <Circle className="h-5 w-5 text-zinc-600 flex-shrink-0 mt-0.5" />
              )}
              <span
                className={`text-sm flex-1 ${todo.completed
                    ? 'line-through text-zinc-600'
                    : 'text-zinc-300'
                  }`}
              >
                {todo.title}
              </span>
            </div>
          ))}
        </div>

        {todos.length === 0 && (
          <div className="text-center py-8 text-zinc-600 text-sm">
            No hay tareas pendientes
          </div>
        )}
      </ZenCardContent>
    </ZenCard>
  );
}
