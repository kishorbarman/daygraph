import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import TodayTab from '../TodayTab'
import type { ActivityRecord } from '../../../types'

const makeMockActivity = (): ActivityRecord =>
  ({
    id: 'a1',
    activity: 'Breakfast',
    category: 'meal',
    subCategory: 'breakfast',
    timestamp: { toDate: () => new Date('2026-03-21T08:00:00Z') },
    endTimestamp: null,
    durationMinutes: null,
    isPointInTime: true,
    tags: [],
    mood: null,
    energy: null,
    notes: 'Breakfast',
    source: 'text',
    rawInput: 'Breakfast',
    createdAt: { toDate: () => new Date('2026-03-21T08:00:00Z') },
    editedAt: null,
  }) as unknown as ActivityRecord

const {
  createActivitiesFromPreviewMock,
  createRawActivityInputMock,
  createPresetActivityMock,
  deleteActivityEntryMock,
  parseActivityPreviewMock,
  retryRawActivityInputMock,
  saveActivityEditsMock,
  useTodayActivitiesMock,
  useActivityMonthDaysMock,
  useTodayRawQueueMock,
} = vi.hoisted(() => ({
  createActivitiesFromPreviewMock: vi.fn(),
  createRawActivityInputMock: vi.fn(),
  createPresetActivityMock: vi.fn(),
  deleteActivityEntryMock: vi.fn(),
  parseActivityPreviewMock: vi.fn(),
  retryRawActivityInputMock: vi.fn(),
  saveActivityEditsMock: vi.fn(),
  useTodayActivitiesMock: vi.fn<
    () => {
      activities: ActivityRecord[]
      isLoading: boolean
      errorMessage: string | null
    }
  >(),
  useActivityMonthDaysMock: vi.fn(() => ({ dayKeys: [], isLoading: false })),
  useTodayRawQueueMock: vi.fn(() => ({ rawItems: [] })),
}))

vi.mock('../../../services/activityService', () => ({
  createActivitiesFromPreview: createActivitiesFromPreviewMock,
  createRawActivityInput: createRawActivityInputMock,
  createPresetActivity: createPresetActivityMock,
  deleteActivityEntry: deleteActivityEntryMock,
  retryRawActivityInput: retryRawActivityInputMock,
  saveActivityEdits: saveActivityEditsMock,
}))

vi.mock('../../../services/parseService', () => ({
  parseActivityPreview: parseActivityPreviewMock,
}))

vi.mock('../../../hooks/useTodayActivities', () => ({
  useTodayActivities: useTodayActivitiesMock,
}))

vi.mock('../../../hooks/useTodayRawQueue', () => ({
  useTodayRawQueue: useTodayRawQueueMock,
}))

vi.mock('../../../hooks/useActivityMonthDays', () => ({
  useActivityMonthDays: useActivityMonthDaysMock,
}))

describe('TodayTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useTodayActivitiesMock.mockReturnValue({
      activities: [],
      isLoading: false,
      errorMessage: null,
    })
    useTodayRawQueueMock.mockReturnValue({ rawItems: [] })
    parseActivityPreviewMock.mockResolvedValue({
      parsed: [
        {
          activity: 'Worked on roadmap',
          category: 'work',
          subCategory: 'general',
          timestamp: new Date('2026-03-21T08:30:00Z').toISOString(),
          endTimestamp: null,
          durationMinutes: null,
          isPointInTime: true,
          tags: [],
          quantity: null,
          timezone: 'America/Los_Angeles',
        },
      ],
      confidence: 0.8,
      warnings: [],
    })
  })

  it('parses text input and saves from preview modal', async () => {
    const user = userEvent.setup()

    render(<TodayTab user={{ uid: 'u1' } as never} />)

    await user.type(screen.getByLabelText('What do you want to log?'), 'Worked on roadmap')
    await user.click(screen.getByRole('button', { name: 'Log' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(parseActivityPreviewMock).toHaveBeenCalled()
    expect(createActivitiesFromPreviewMock).toHaveBeenCalledWith(
      'u1',
      expect.any(Array),
      'Worked on roadmap',
      'text',
    )
  })

  it('logs a preset activity when preset is clicked', async () => {
    const user = userEvent.setup()

    render(<TodayTab user={{ uid: 'u1' } as never} />)

    await user.click(screen.getByRole('button', { name: /Coffee/i }))

    expect(createPresetActivityMock).toHaveBeenCalled()
    expect(createPresetActivityMock.mock.calls[0][0]).toBe('u1')
  })

  it('opens edit modal and saves activity changes', async () => {
    const user = userEvent.setup()
    useTodayActivitiesMock.mockReturnValue({
      activities: [makeMockActivity()],
      isLoading: false,
      errorMessage: null,
    })

    render(<TodayTab user={{ uid: 'u1' } as never} />)

    const timelineSection = screen
      .getByRole('heading', { name: 'Timeline' })
      .closest('section')
    expect(timelineSection).not.toBeNull()
    await user.click(within(timelineSection as HTMLElement).getByText('Breakfast'))
    await user.clear(screen.getByDisplayValue('Breakfast'))
    await user.type(screen.getByRole('textbox', { name: /Activity/i }), 'Late breakfast')
    await user.selectOptions(screen.getByRole('combobox', { name: /Category/i }), 'leisure')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(saveActivityEditsMock).toHaveBeenCalled()
  })

  it('deletes an activity from edit modal', async () => {
    const user = userEvent.setup()
    useTodayActivitiesMock.mockReturnValue({
      activities: [makeMockActivity()],
      isLoading: false,
      errorMessage: null,
    })

    render(<TodayTab user={{ uid: 'u1' } as never} />)

    const timelineSection = screen
      .getByRole('heading', { name: 'Timeline' })
      .closest('section')
    expect(timelineSection).not.toBeNull()
    await user.click(within(timelineSection as HTMLElement).getByText('Breakfast'))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(deleteActivityEntryMock).toHaveBeenCalledWith('u1', 'a1')
  })
})
