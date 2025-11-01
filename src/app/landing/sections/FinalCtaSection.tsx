import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Container } from '../components/Container';
import { useRouter } from 'next/navigation';

const Section = styled.section`
  padding: 6rem 0;
  background: linear-gradient(135deg, ${props => props.theme.colors.primary} 0%, ${props => props.theme.colors.secondary} 100%);
  color: white;
  text-align: center;
`;

const ContentWrapper = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
`;

const Title = styled.h2`
  font-size: 2.5rem;
  font-weight: 700;
  max-width: 600px;
  line-height: 1.3;
`;

const CtaButton = styled(motion.button)`
  padding: 1rem 3rem;
  font-size: 1.2rem;
  font-weight: 600;
  color: ${props => props.theme.colors.primary};
  background-color: white;
  border: none;
  border-radius: ${props => props.theme.radii.pill};
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
  }
`;

const FinalCtaSection = () => {
  const router = useRouter();

  return (
    <Section id="final-cta">
      <Container>
        <ContentWrapper
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7 }}
        >
          <Title>이제 복잡한 툴들은 잊으세요. FunCommute로 스마트하게 일할 시간입니다.</Title>
          <CtaButton
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

export default FinalCtaSection;