import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import TodayTab from '../TodayTab'
import type { ActivityRecord } from '../../../types'

const {
  createManualTextActivityMock,
  createPresetActivityMock,
  useTodayActivitiesMock,
} = vi.hoisted(() => ({
  createManualTextActivityMock: vi.fn(),
  createPresetActivityMock: vi.fn(),
  useTodayActivitiesMock: vi.fn<
    () => {
      activities: ActivityRecord[]
      isLoading: boolean
      errorMessage: string | null
    }
  >(),
}))

vi.mock('../../../services/activityService', () => ({
  createManualTextActivity: createManualTextActivityMock,
  createPresetActivity: createPresetActivityMock,
}))

vi.mock('../../../hooks/useTodayActivities', () => ({
  useTodayActivities: useTodayActivitiesMock,
}))

describe('TodayTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useTodayActivitiesMock.mockReturnValue({
      activities: [],
      isLoading: false,
      errorMessage: null,
    })
  })

  it('submits manual text activity through service', async () => {
    const user = userEvent.setup()

    render(<TodayTab user={{ uid: 'u1' } as never} />)

    await user.type(screen.getByLabelText('What did you do?'), 'Worked on roadmap')
    await user.click(screen.getByRole('button', { name: 'Log' }))

    expect(createManualTextActivityMock).toHaveBeenCalledWith(
      'u1',
      'Worked on roadmap',
    )
  })

  it('logs a preset activity when preset is clicked', async () => {
    const user = userEvent.setup()

    render(<TodayTab user={{ uid: 'u1' } as never} />)

    await user.click(screen.getByRole('button', { name: /Coffee/i }))

    expect(createPresetActivityMock).toHaveBeenCalled()
    expect(createPresetActivityMock.mock.calls[0][0]).toBe('u1')
  })
})
