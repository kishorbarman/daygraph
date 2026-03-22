import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Timeline from '../Timeline'
import type { ActivityRecord } from '../../../types'

const mockActivity = {
  id: 'a1',
  activity: 'Walk Nugget',
  category: 'exercise',
  subCategory: 'walk',
  timestamp: {
    toDate: () => new Date('2026-03-21T08:30:00Z'),
  },
  endTimestamp: null,
  durationMinutes: 30,
  isPointInTime: false,
  tags: [],
  mood: null,
  energy: null,
  notes: 'Walked Nugget',
  source: 'text',
  rawInput: 'Walked Nugget',
  createdAt: {
    toDate: () => new Date('2026-03-21T08:30:00Z'),
  },
  editedAt: null,
} as unknown as ActivityRecord

const selectedDate = new Date('2026-03-21T08:30:00Z')

describe('Timeline', () => {
  it('renders loading state', () => {
    render(
      <Timeline
        activityDateKeys={[]}
        activities={[]}
        errorMessage={null}
        isLoading
        onActivityClick={vi.fn()}
        onDateChange={vi.fn()}
        selectedDate={selectedDate}
      />,
    )

    expect(screen.getByText('Timeline')).toBeInTheDocument()
    expect(screen.getByText('Loading activities...')).toBeInTheDocument()
  })

  it('renders error state', () => {
    render(
      <Timeline
        activityDateKeys={[]}
        activities={[]}
        errorMessage="Unable to load timeline"
        isLoading={false}
        onActivityClick={vi.fn()}
        onDateChange={vi.fn()}
        selectedDate={selectedDate}
      />,
    )

    expect(screen.getByText('Unable to load timeline')).toBeInTheDocument()
  })

  it('renders activity entries', () => {
    render(
      <Timeline
        activityDateKeys={['2026-03-21']}
        activities={[mockActivity]}
        errorMessage={null}
        isLoading={false}
        onActivityClick={vi.fn()}
        onDateChange={vi.fn()}
        selectedDate={selectedDate}
      />,
    )

    expect(screen.getByText('Walk Nugget')).toBeInTheDocument()
    expect(screen.getByText(/exercise/)).toBeInTheDocument()
    expect(screen.getByText(/30 min/)).toBeInTheDocument()
  })
})
