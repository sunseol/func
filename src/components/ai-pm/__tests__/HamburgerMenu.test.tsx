import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import HamburgerMenu from '../HamburgerMenu';

describe('HamburgerMenu', () => {
  const defaultProps = {
    isOpen: false,
    onClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders hamburger menu button', () => {
    render(<HamburgerMenu {...defaultProps} />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', '메뉴 열기');
  });

  it('shows correct aria-label when closed', () => {
    render(<HamburgerMenu {...defaultProps} isOpen={false} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', '메뉴 열기');
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows correct aria-label when open', () => {
    render(<HamburgerMenu {...defaultProps} isOpen={true} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', '메뉴 닫기');
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('calls onClick when clicked', () => {
    const mockOnClick = jest.fn();
    render(<HamburgerMenu {...defaultProps} onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('has minimum touch target size', () => {
    render(<HamburgerMenu {...defaultProps} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('min-h-[44px]');
    expect(button).toHaveClass('min-w-[44px]');
  });

  it('applies different sizes correctly', () => {
    const { rerender } = render(<HamburgerMenu {...defaultProps} size="sm" />);
    let button = screen.getByRole('button');
    expect(button).toHaveClass('min-h-[44px]');
    
    rerender(<HamburgerMenu {...defaultProps} size="lg" />);
    button = screen.getByRole('button');
    expect(button).toHaveClass('min-h-[48px]');
  });

  it('applies different colors correctly', () => {
    const { rerender } = render(<HamburgerMenu {...defaultProps} color="gray" />);
    let button = screen.getByRole('button');
    expect(button).toHaveClass('text-gray-400');
    
    rerender(<HamburgerMenu {...defaultProps} color="blue" />);
    button = screen.getByRole('button');
    expect(button).toHaveClass('text-blue-600');
  });

  it('has proper focus styles', () => {
    render(<HamburgerMenu {...defaultProps} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('focus:outline-none');
    expect(button).toHaveClass('focus:ring-2');
    expect(button).toHaveClass('focus:ring-blue-500');
  });
});