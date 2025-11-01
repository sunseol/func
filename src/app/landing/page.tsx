'use client';

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { GlobalStyle } from './styles/GlobalStyle';
import { theme } from './styles/theme';
import Header from './components/Header';
import Footer from './components/Footer';
import HeroSection from './sections/HeroSection';
import ProblemSection from './sections/ProblemSection';
import SolutionSection from './sections/SolutionSection';
import FeaturesSection from './sections/FeaturesSection';
import SocialProofSection from './sections/SocialProofSection';
import PricingSection from './sections/PricingSection';
import FinalCtaSection from './sections/FinalCtaSection';
import FaqSection from './sections/FaqSection';

export default function LandingPage() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <Header />
      <main>
        <HeroSection />
        <ProblemSection />
        <SolutionSection />
        <FeaturesSection />
        <SocialProofSection />
        <PricingSection />
        <FinalCtaSection />
        <FaqSection />
      </main>
      <Footer />
    </ThemeProvider>
  );
}
