import React from 'react'
import { render, screen, fireEvent, waitFor } from '@/lib/test-utils'
import ProjectCard from '../ProjectCard'
import { mockProject, mockUser } from '@/lib/test-utils'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}))

describe('ProjectCard', () => {
  const defaultProps = {
    project: mockProject,
    isAdmin: true,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders project information correctly', () => {
    render(<ProjectCard {...defaultProps} />)

    expect(screen.getByText(mockProject.name)).toBeInTheDocument()
    expect(screen.getByText(mockProject.description)).toBeInTheDocument()
    expect(screen.getByText(mockProject.creator.name)).toBeInTheDocument()
  })

  it('displays project status badge', () => {
    render(<ProjectCard {...defaultProps} />)

    const statusBadge = screen.getByText('활성')
    expect(statusBadge).toBeInTheDocument()
    expect(statusBadge).toHaveClass('bg-green-100', 'text-green-800')
  })

  it('shows admin actions when user is admin', () => {
    render(<ProjectCard {...defaultProps} />)

    expect(screen.getByText('관리')).toBeInTheDocument()
    expect(screen.getByText('멤버')).toBeInTheDocument()
  })

  it('hides admin actions when user is not admin', () => {
    render(<ProjectCard {...defaultProps} isAdmin={false} />)

    expect(screen.queryByText('관리')).not.toBeInTheDocument()
    expect(screen.queryByText('멤버')).not.toBeInTheDocument()
  })

  it('displays correct creation date', () => {
    render(<ProjectCard {...defaultProps} />)

    const dateElement = screen.getByText(/\d{4}년 \d{1,2}월 \d{1,2}일/)
    expect(dateElement).toBeInTheDocument()
  })

  it('shows project creator information', () => {
    render(<ProjectCard {...defaultProps} />)

    expect(screen.getByText(`생성자: ${mockProject.creator.name}`)).toBeInTheDocument()
  })

  it('applies correct styling classes', () => {
    render(<ProjectCard {...defaultProps} />)

    const card = screen.getByRole('article')
    expect(card).toHaveClass(
      'bg-white',
      'rounded-lg',
      'shadow-sm',
      'border',
      'border-gray-200',
      'hover:shadow-md',
      'transition-shadow'
    )
  })

  it('handles click events', async () => {
    const mockPush = jest.fn()
    jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({
      push: mockPush,
    })

    render(<ProjectCard {...defaultProps} />)

    const card = screen.getByRole('article')
    fireEvent.click(card)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(`/ai-pm/${mockProject.id}`)
    })
  })

  it('displays different status badges for different statuses', () => {
    const archivedProject = { ...mockProject, status: 'archived' }
    
    render(<ProjectCard {...defaultProps} project={archivedProject} />)

    const statusBadge = screen.getByText('보관됨')
    expect(statusBadge).toBeInTheDocument()
    expect(statusBadge).toHaveClass('bg-gray-100', 'text-gray-800')
  })

  it('handles missing project description gracefully', () => {
    const projectWithoutDescription = { ...mockProject, description: null }
    
    render(<ProjectCard {...defaultProps} project={projectWithoutDescription} />)

    expect(screen.getByText('설명 없음')).toBeInTheDocument()
  })

  it('handles missing creator information gracefully', () => {
    const projectWithoutCreator = { ...mockProject, creator: null }
    
    render(<ProjectCard {...defaultProps} project={projectWithoutCreator} />)

    expect(screen.getByText('생성자: 알 수 없음')).toBeInTheDocument()
  })

  it('applies hover effects on mouse enter', () => {
    render(<ProjectCard {...defaultProps} />)

    const card = screen.getByRole('article')
    
    fireEvent.mouseEnter(card)
    expect(card).toHaveClass('hover:shadow-md')
  })

  it('renders with accessibility attributes', () => {
    render(<ProjectCard {...defaultProps} />)

    const card = screen.getByRole('article')
    expect(card).toHaveAttribute('tabIndex', '0')
    expect(card).toHaveAttribute('role', 'article')
  })

  it('handles keyboard navigation', async () => {
    const mockPush = jest.fn()
    jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({
      push: mockPush,
    })

    render(<ProjectCard {...defaultProps} />)

    const card = screen.getByRole('article')
    fireEvent.keyDown(card, { key: 'Enter' })

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(`/ai-pm/${mockProject.id}`)
    })
  })

  it('handles space key navigation', async () => {
    const mockPush = jest.fn()
    jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({
      push: mockPush,
    })

    render(<ProjectCard {...defaultProps} />)

    const card = screen.getByRole('article')
    fireEvent.keyDown(card, { key: ' ' })

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(`/ai-pm/${mockProject.id}`)
    })
  })

  it('prevents default behavior on space key', () => {
    render(<ProjectCard {...defaultProps} />)

    const card = screen.getByRole('article')
    const event = new KeyboardEvent('keydown', { key: ' ' })
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault')

    fireEvent.keyDown(card, event)
    expect(preventDefaultSpy).toHaveBeenCalled()
  })
}) 