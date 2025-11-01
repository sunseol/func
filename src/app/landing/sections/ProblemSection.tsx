import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Container } from '../components/Container';
import { FaRegSadTear, FaSearch, FaRegTired } from 'react-icons/fa';

const Section = styled.section`
  padding: 6rem 0;
  background-color: ${props => props.theme.colors.backgroundLight};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: 4rem 0;
  }
`;

const SectionTitle = styled.h2`
  font-size: 2.5rem;
  text-align: center;
  margin-bottom: 4rem;
  color: ${props => props.theme.colors.text};
`;

const ProblemGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
`;

const ProblemCard = styled(motion.div)`
  background: ${props => props.theme.colors.cardBg};
  padding: 2.5rem 2rem;
  border-radius: ${props => props.theme.radii.large};
  text-align: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  border: 1px solid ${props => props.theme.colors.border};
`;

const IconWrapper = styled.div`
  font-size: 3rem;
  color: ${props => props.theme.colors.primary};
  margin-bottom: 1.5rem;
`;

const ProblemTitle = styled.h3`
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: ${props => props.theme.colors.text};
`;

const ProblemDescription = styled.p`
  font-size: 1rem;
  color: ${props => props.theme.colors.textSecondary};
  line-height: 1.6;
`;

const cardVariants = {
  offscreen: {
    y: 50,
    opacity: 0,
  },
  onscreen: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      bounce: 0.4,
      duration: 0.8,
    },
  },
};

const problems = [
  {
    icon: <FaRegSadTear />,
    title: '수많은 협업 툴',
    description: '수십 개의 다른 툴을 사용하느라 오히려 소통 비용이 늘고 혼란만 가중되나요?',
  },
  {
    icon: <FaSearch />,
    title: '정보의 파편화',
    description: '중요한 공지나 파일을 찾기 위해 메신저, 이메일, 클라우드를 모두 헤매고 있나요?',
  },
  {
    icon: <FaRegTired />,
    title: '번거로운 행정 절차',
    description: '휴가 신청, 비용 처리, 품의서 작성... 아직도 비효율적인 절차에 지치셨나요?',
  },
];

const ProblemSection = () => {
  return (
    <Section id="problem">
      <Container>
        <SectionTitle>혹시 당신의 팀도 이런가요?</SectionTitle>
        <ProblemGrid>
          {problems.map((problem, index) => (
            <ProblemCard
              key={index}
              initial="offscreen"
              whileInView="onscreen"
              viewport={{ once: true, amount: 0.5 }}
              variants={cardVariants}
            >
              <IconWrapper>{problem.icon}</IconWrapper>
              <ProblemTitle>{problem.title}</ProblemTitle>
              <ProblemDescription>{problem.description}</ProblemDescription>
            </ProblemCard>
          ))}
        </ProblemGrid>
      </Container>
    </Section>
  );
};

export default ProblemSection;