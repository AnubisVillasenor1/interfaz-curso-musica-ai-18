import { randomUUID } from 'crypto'

import type { GenerateMusicRequest, MusicTask, MusicTaskStatus } from '@/lib/music/types'

export interface TaskRecord extends MusicTask {
  request: GenerateMusicRequest
}

/**
 * Almacén en memoria del proceso (MVP del manual §8).
 *
 * La verdad persistente es la fila `songs` en Supabase (`provider_task_id`),
 * que es lo que lee `/api/task/[taskId]`. Este mapa es el registro
 * operativo del nodo que aceptó la petición (estado fino, modelo, prompt)
 * y desaparece al reiniciar: nunca es la única copia del audio.
 */
const tasks = new Map<string, TaskRecord>()

export function createTask(input: {
  taskId: string
  provider: MusicTask['provider']
  model?: string
  request: GenerateMusicRequest
}): TaskRecord {
  const now = new Date().toISOString()
  const task: TaskRecord = {
    taskId: input.taskId,
    status: 'queued',
    provider: input.provider,
    model: input.model,
    createdAt: now,
    updatedAt: now,
    request: input.request,
  }
  tasks.set(task.taskId, task)
  return task
}

export function getTask(taskId: string): TaskRecord | undefined {
  return tasks.get(taskId)
}

export function updateTask(taskId: string, updates: Partial<TaskRecord>): TaskRecord | undefined {
  const task = tasks.get(taskId)
  if (!task) return undefined
  const updated: TaskRecord = { ...task, ...updates, updatedAt: new Date().toISOString() }
  tasks.set(taskId, updated)
  return updated
}

export function setTaskStatus(
  taskId: string,
  status: MusicTaskStatus,
  extra: Partial<TaskRecord> = {},
): TaskRecord | undefined {
  return updateTask(taskId, { status, ...extra })
}

export function createTaskId(prefix = 'task'): string {
  return `${prefix}_${randomUUID()}`
}
