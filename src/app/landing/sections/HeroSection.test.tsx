import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider } from 'styled-components';
import HeroSection from './HeroSection';
import { theme } from '../styles/theme';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

describe('landing hero responsive treatment', () => {
  it('keeps Korean phrases intact and exposes a touch-safe mobile menu contract', () => {
    render(
      <ThemeProvider theme={theme}>
        <HeroSection />
      </ThemeProvider>,
    );

    const headline = screen.getByRole('heading', { name: /흩어져 있는 모든 업무/ });
    const subheadline = screen.getByText(/혁신적인 올인원 워크 플랫폼/);

    expect(headline).toHaveStyle('word-break: keep-all');
    expect(headline).toHaveStyle('overflow-wrap: normal');
    expect(subheadline).toHaveStyle('color: rgb(255, 255, 255)');
  });
});
