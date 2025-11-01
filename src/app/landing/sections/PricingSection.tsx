import React from 'react';
import styled, { css } from 'styled-components';
import { motion } from 'framer-motion';
import { Container } from '../components/Container';
import { FaCheckCircle } from 'react-icons/fa';
import { useRouter } from 'next/navigation';

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

const PricingGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  align-items: stretch;
`;

const PriceCard = styled(motion.div)<{ $recommended?: boolean; $enterprise?: boolean }>`
  background: ${props => props.theme.colors.cardBg};
  padding: 2.5rem;
  border-radius: 15px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  text-align: center;
  border: 2px solid ${props => props.theme.colors.border};
  transition: transform 0.3s, box-shadow 0.3s;
  display: flex;
  flex-direction: column;
  align-items: center;

  ${props =>
    props.$recommended &&
    css`
      border-color: ${props.theme.colors.primary};
      transform: scale(1.05);
      box-shadow: 0 10px 30px rgba(0, 123, 233, 0.2);
    `}

  ${props =>
    props.$enterprise &&
    css`
      background: linear-gradient(135deg, ${props.theme.colors.primary} 0%, ${props.theme.colors.secondary} 100%);
      color: white;
      padding: 2rem;
      border-radius: 20px;
      box-shadow: 0 15px 40px rgba(0, 123, 233, 0.3);
      transform: scale(1.02);
    `}
`;

const PlanName = styled.h3<{ $enterprise?: boolean }>`
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: ${props => props.$enterprise ? 'white' : 'inherit'};
`;

const Price = styled.p<{ $enterprise?: boolean }>`
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: ${props => props.$enterprise ? 'white' : props.theme.colors.primary};
`;

const PriceDescription = styled.div<{ $enterprise?: boolean }>`
  color: ${props => props.$enterprise ? 'white' : props.theme.colors.textSecondary};
  margin-bottom: 2rem;
  text-align: center;
`;

const FeatureList = styled.ul`
  list-style: none;
  text-align: left;
  margin-bottom: 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex-grow: 1;
`;

const FeatureItem = styled.li<{ $enterprise?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${props => props.$enterprise ? 'white' : props.theme.colors.text};

  svg {
    color: ${props => props.$enterprise ? 'white' : props.theme.colors.secondary};
  }
`;

const CtaButton = styled.button<{ $recommended?: boolean; $enterprise?: boolean }>`
  width: 100%;
  padding: 1rem;
  font-size: 1.1rem;
  font-weight: 600;
  border-radius: ${props => props.theme.radii.medium};
  cursor: pointer;
  transition: background-color 0.3s;

  ${props =>
    props.$recommended
      ? css`
          background-color: ${props.theme.colors.primary};
          color: white;
          border: none;
        `
      : props.$enterprise
      ? css`
          background-color: white;
          color: ${props.theme.colors.primary};
          border: none;
        `
      : css`
          background-color: transparent;
          color: ${props.theme.colors.text};
          border: 2px solid ${props.theme.colors.primary};
        `}
`;

const cardVariants = {
  offscreen: { y: 50, opacity: 0 },
  onscreen: { y: 0, opacity: 1, transition: { duration: 0.5 } },
};

const plans = [
  {
    name: 'Free',
    price: '무료',
    description: '개인 사용 또는 소규모 팀',
    features: ['실시간 메신저', '할 일 관리', '10GB 스토리지'],
  },
  {
    name: 'Basic',
    price: '5만원',
    description: '10인 이하 팀 추천',
    features: ['실시간 메신저', '할 일 관리', '50GB 스토리지'],
    recommended: true,
  },
  {
    name: 'Pro',
    price: '1.2만원',
    description: '사용자당/월',
    features: ['Basic 모든 기능', '프로젝트 관리', '전자결재', '인사관리', '무제한 스토리지'],
  },
  {
    name: 'Enterprise',
    price: '별도 문의',
    description: '보안과 관리가 중요한 조직',
    features: ['Pro 모든 기능', '전용 기술 지원', '강화된 보안', '커스터마이징'],
    enterprise: true,
  },
];

const PricingSection = () => {
  const router = useRouter();

  return (
    <Section id="pricing">
      <Container>
        <SectionTitle>귀사의 규모와 필요에 맞는 플랜을 선택하세요.</SectionTitle>
        <PricingGrid>
          {plans.slice(0, 3).map((plan, index) => (
            <PriceCard
              key={index}
              $recommended={plan.recommended}
              initial="offscreen"
              whileInView="onscreen"
              viewport={{ once: true, amount: 0.5 }}
              variants={cardVariants}
            >
              <PlanName>{plan.name}</PlanName>
              <Price>{plan.price}</Price>
              <PriceDescription>{plan.description}</PriceDescription>
              <FeatureList>
                {plan.features.map((feature, i) => (
                  <FeatureItem key={i}>
                    <FaCheckCircle /> {feature}
                  </FeatureItem>
                ))}
              </FeatureList>
              <CtaButton
                $recommended={plan.recommended}
                onClick={() => router.push('/login')}
              >
                시작하기
              </CtaButton>
            </PriceCard>
          ))}
        </PricingGrid>
        <PricingGrid style={{ gridTemplateColumns: '1fr', marginTop: '2rem' }}>
          {plans.slice(3).map((plan, index) => (
            <PriceCard
              key={index + 3}
              $recommended={plan.recommended}
              $enterprise={plan.enterprise}
              initial="offscreen"
              whileInView="onscreen"
              viewport={{ once: true, amount: 0.5 }}
              variants={cardVariants}
            >
              <PlanName $enterprise={plan.enterprise}>{plan.name}</PlanName>
              <Price $enterprise={plan.enterprise}>{plan.price}</Price>
              <PriceDescription $enterprise={plan.enterprise}>{plan.description}</PriceDescription>
              <FeatureList>
                {plan.features.map((feature, i) => (
                  <FeatureItem key={i} $enterprise={plan.enterprise}>
                    <FaCheckCircle /> {feature}
                  </FeatureItem>
                ))}
              </FeatureList>
              <CtaButton
                $recommended={plan.recommended}
                $enterprise={plan.enterprise}
                onClick={() => router.push('/login')}
              >
                시작하기
              </CtaButton>
            </PriceCard>
          ))}
        </PricingGrid>
      </Container>
    </Section>
  );
};

export default PricingSection;