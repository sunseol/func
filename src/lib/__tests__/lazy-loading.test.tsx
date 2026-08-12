import { render, screen } from '@testing-library/react';
import { withLazyLoading } from '../lazy-loading';

jest.mock('@/contexts/ViewportContext', () => ({
  useViewport: () => ({ isMobile: false }),
}));

jest.mock('@/components/ui/LoadingSkeletons', () => ({
  __esModule: true,
  default: { Card: () => <div data-testid="loading" /> },
}));

describe('withLazyLoading', () => {
  it('renders the lazy component without conditional hook invocation', async () => {
    const LazyComponent = withLazyLoading(async () => ({
      default: function LoadedComponent() {
        return <div data-testid="loaded" />;
      },
    }), { mobileOnly: true });

    render(<LazyComponent />);

    expect(await screen.findByTestId('loaded')).toBeInTheDocument();
  });
});
