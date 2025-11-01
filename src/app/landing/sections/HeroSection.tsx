import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Container } from '../components/Container';
import { useRouter } from 'next/navigation';

const Section = styled.section`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  background-image: url('https://images.unsplash.com/photo-1536148935331-408321065b18?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1974&q=80');
  background-size: cover;
  background-position: center;
  padding-top: 80px; /* Header height */
`;

const ContentWrapper = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
`;

const Headline = styled(motion.h1)`
  font-size: 3.5rem;
  font-weight: 800;
  color: ${props => props.theme.colors.text};
  max-width: 800px;
  line-height: 1.2;
  text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.7);

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 2.5rem;
  }
`;

const Subheadline = styled(motion.p)`
  font-size: 1.25rem;
  max-width: 700px;
  color: ${props => props.theme.colors.textSecondary};
  text-shadow: 1px 1px 4px rgba(0, 0, 0, 0.7);

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 1rem;
  }
`;

const CtaButton = styled(motion.button)`
  padding: 1rem 2.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
  background-color: ${props => props.theme.colors.primary};
  border: none;
  border-radius: ${props => props.theme.radii.pill};
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  }
`;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
};

const HeroSection = () => {
  const router = useRouter();

  return (
    <Section id="hero">
      <Container>
        <ContentWrapper
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <Headline variants={itemVariants}>
            흩어져 있는 모든 업무,
            <br />
            이제 한 곳에서 해결하세요.
          </Headline>
          <Subheadline variants={itemVariants}>
            혁신적인 올인원 워크 플랫폼, <strong>FunCommute</strong>는 실시간 소통과 협업, 인사/재무 관리 등 회사 생활에 필요한 모든 기능을 하나의 플랫폼에 담아, 팀의 생산성을 극대화합니다.
          </Subheadline>
          <CtaButton
            variants={itemVariants}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/login')}
          >
            지금 바로 무료로 시작하기
          </CtaButton>
        </ContentWrapper>
      </Container>
    </Section>
  );
};

export default HeroSection;