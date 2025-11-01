import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Container } from '../components/Container';
import { FaComments, FaTasks, FaFolderOpen, FaRegPaperPlane, FaUsers, FaCalendarAlt } from 'react-icons/fa';

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
  margin-bottom: 1rem;
  color: ${props => props.theme.colors.text};
`;

const SectionSubtitle = styled.p`
  font-size: 1.1rem;
  text-align: center;
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: 4rem;
`;

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
`;

const FeatureCard = styled(motion.div)`
  background: ${props => props.theme.colors.cardBg};
  padding: 2.5rem 2rem;
  border-radius: ${props => props.theme.radii.large};
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  border: 1px solid ${props => props.theme.colors.border};
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const IconWrapper = styled.div`
  font-size: 2.5rem;
  color: ${props => props.theme.colors.primary};
`;

const FeatureTitle = styled.h3`
  font-size: 1.3rem;
  color: ${props => props.theme.colors.text};
`;

const FeatureDescription = styled.p`
  font-size: 1rem;
  color: ${props => props.theme.colors.textSecondary};
  line-height: 1.6;
`;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { y: 30, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5 },
  },
};

const features = [
  { icon: <FaComments />, title: '실시간 소통 & 메신저', description: '주제별 대화방, 화상 회의, 전사 공지 등 막힘없는 소통을 지원합니다.' },
  { icon: <FaTasks />, title: '프로젝트 & 할 일 관리', description: '칸반 보드, 간트 차트, 담당자 지정 기능으로 프로젝트 현황을 한눈에 파악하세요.' },
  { icon: <FaFolderOpen />, title: '클라우드 & 문서 중앙화', description: '모든 파일을 안전하게 저장하고, 강력한 검색과 버전 관리로 손쉽게 협업할 수 있습니다.' },
  { icon: <FaRegPaperPlane />, title: '전자결재 & 워크플로우', description: '커스텀 결재선, 다양한 기본 양식으로 빠르고 투명한 의사결정이 가능해집니다.' },
  { icon: <FaUsers />, title: '인사관리 & 조직도', description: '임직원 정보, 근태/휴가 관리, 조직도 확인까지 HR 업무를 간소화합니다.' },
  { icon: <FaCalendarAlt />, title: '공유 캘린더 & 자원 예약', description: '팀원의 일정을 확인하고, 회의실이나 공용 장비 등 사내 자원을 손쉽게 예약하세요.' },
];

const FeaturesSection = () => {
  return (
    <Section id="features">
      <Container>
        <SectionTitle>FunCommute 하나로 충분합니다.</SectionTitle>
        <SectionSubtitle>업무에 필요한 모든 것이 이미 준비되어 있습니다.</SectionSubtitle>
        <FeatureGrid
          as={motion.div}
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {features.map((feature, index) => (
            <FeatureCard key={index} variants={cardVariants}>
              <IconWrapper>{feature.icon}</IconWrapper>
              <FeatureTitle>{feature.title}</FeatureTitle>
              <FeatureDescription>{feature.description}</FeatureDescription>
            </FeatureCard>
          ))}
        </FeatureGrid>
      </Container>
    </Section>
  );
};

export default FeaturesSection;