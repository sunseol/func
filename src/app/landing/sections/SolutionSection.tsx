import React from 'react';
import styled from 'styled-components';
import { motion, type Variants } from 'framer-motion';
import { Container } from '../components/Container';

const Section = styled.section`
  padding: 6rem 0;
  overflow: hidden;
  background-color: ${props => props.theme.colors.background};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: 4rem 0;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  gap: 4rem;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`;

const TextContent = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const SectionTitle = styled.h2`
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1.3;
  color: ${props => props.theme.colors.text};
`;

const Description = styled.p`
  font-size: 1.1rem;
  color: ${props => props.theme.colors.textSecondary};
  line-height: 1.7;
`;

const ImageContent = styled(motion.div)`
  width: 100%;
  height: 450px;
  background-image: url('https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80');
  background-size: cover;
  background-position: center;
  border-radius: ${props => props.theme.radii.large};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: #9e9e9e;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
`;

const textVariants: Variants = {
  offscreen: {
    x: -100,
    opacity: 0,
  },
  onscreen: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      bounce: 0.4,
      duration: 1,
    },
  },
};

const imageVariants: Variants = {
  offscreen: {
    x: 100,
    opacity: 0,
  },
  onscreen: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      bounce: 0.4,
      duration: 1,
    },
  },
};

const SolutionSection = () => {
  return (
    <Section id="solution">
      <Container>
        <Grid>
          <TextContent
            initial="offscreen"
            whileInView="onscreen"
            viewport={{ once: true, amount: 0.5 }}
            variants={textVariants}
          >
            <SectionTitle>FunCommute, 파편화된 업무를 하나로 통합합니다.</SectionTitle>
            <Description>
              FunCommute는 직관적인 인터페이스 안에서 모든 업무가 자연스럽게 연결되도록 설계되었습니다. 메신저에서 나눈 대화가 바로 할 일로 등록되고, 프로젝트 현황은 캘린더와 연동되며, 모든 기록은 중앙에서 안전하게 관리됩니다. 이제 여러 툴을 전전할 필요 없이, FunCommute 하나로 업무의 흐름을 완성하세요.
            </Description>
          </TextContent>
          <ImageContent
            initial="offscreen"
            whileInView="onscreen"
            viewport={{ once: true, amount: 0.5 }}
            variants={imageVariants}
          >

          </ImageContent>
        </Grid>
      </Container>
    </Section>
  );
};

export default SolutionSection;
