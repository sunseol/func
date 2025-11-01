import StyledComponentsRegistry from '@/lib/registry';

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StyledComponentsRegistry>{children}</StyledComponentsRegistry>;
}
