import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { topicsApi } from '@/api/endpoints'
import type { Topic, TopicStatus } from '@/api/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { parseMoney } from '@/lib/format'
import { strings } from '@/strings'

const STATUSES: TopicStatus[] = ['ACTIVE', 'CLOSED']

export function TopicForm({
  topic,
  open,
  onOpenChange,
}: {
  topic: Topic | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const isEditing = topic !== null

  const [name, setName] = useState(topic?.name ?? '')
  const [description, setDescription] = useState(topic?.description ?? '')
  const [startDate, setStartDate] = useState(topic?.startDate ?? '')
  const [endDate, setEndDate] = useState(topic?.endDate ?? '')
  const [plannedAmount, setPlannedAmount] = useState(
    topic?.plannedAmount === null || topic === null ? '' : String(topic.plannedAmount),
  )
  const [status, setStatus] = useState<TopicStatus>(topic?.status ?? 'ACTIVE')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const mutation = useMutation({
    mutationFn: () => {
      if (isEditing) {
        // Absent leaves a field alone; explicit null clears it.
        const patch: Parameters<typeof topicsApi.update>[1] = {}
        if (name !== topic.name) patch.name = name
        if (description !== (topic.description ?? '')) {
          patch.description = description.trim() === '' ? null : description
        }
        if (startDate !== (topic.startDate ?? '')) {
          patch.startDate = startDate === '' ? null : startDate
        }
        if (endDate !== (topic.endDate ?? '')) {
          patch.endDate = endDate === '' ? null : endDate
        }
        const parsedPlanned = plannedAmount.trim() === '' ? null : parseMoney(plannedAmount)
        if (parsedPlanned !== topic.plannedAmount) patch.plannedAmount = parsedPlanned
        if (status !== topic.status) patch.status = status
        return topicsApi.update(topic.id, patch)
      }
      return topicsApi.create({
        name,
        description: description.trim() === '' ? undefined : description,
        startDate: startDate === '' ? undefined : startDate,
        endDate: endDate === '' ? undefined : endDate,
        plannedAmount: plannedAmount.trim() === '' ? undefined : parseMoney(plannedAmount),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['topics'] })
      toast.success(isEditing ? strings.topics.updated : strings.topics.created)
      onOpenChange(false)
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        // A duplicate name belongs on the name field.
        if (error.code === 'CONFLICT') {
          setFieldErrors({ name: strings.topics.duplicate })
          return
        }
        if (error.hasFieldErrors) {
          setFieldErrors(error.fieldErrors)
          return
        }
        toast.error(error.message)
        return
      }
      toast.error(strings.common.error)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? strings.topics.editTitle : strings.topics.addTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="topic-name">{strings.topics.name}</Label>
            <Input
              id="topic-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            {fieldErrors.name !== undefined && (
              <p className="text-sm text-destructive">{fieldErrors.name}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="topic-description">{strings.topics.description}</Label>
            <Input
              id="topic-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          {/* Dates are metadata: they drive the candidate suggestions and
              nothing else. A transaction outside them attaches fine. */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="topic-start">{strings.topics.startDate}</Label>
              <Input
                id="topic-start"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="topic-end">{strings.topics.endDate}</Label>
              <Input
                id="topic-end"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
              {fieldErrors.endDate !== undefined && (
                <p className="text-sm text-destructive">{fieldErrors.endDate}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="topic-planned">{strings.topics.plannedAmount}, ₸</Label>
            <Input
              id="topic-planned"
              inputMode="decimal"
              placeholder="0,00"
              value={plannedAmount}
              onChange={(event) => setPlannedAmount(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">{strings.topics.plannedHint}</p>
          </div>

          {isEditing && (
            <div className="space-y-1.5">
              <Label>{strings.goals.status}</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus((value ?? 'ACTIVE') as TopicStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((topicStatus) => (
                    <SelectItem key={topicStatus} value={topicStatus}>
                      {strings.topics.statuses[topicStatus]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {strings.common.cancel}
          </Button>
          <Button
            type="button"
            disabled={mutation.isPending || name.trim() === ''}
            onClick={() => mutation.mutate()}
          >
            {strings.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
