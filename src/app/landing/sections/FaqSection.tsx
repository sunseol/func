import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Container } from '../components/Container';
import { FaPlus, FaMinus } from 'react-icons/fa';

const Section = styled.section`
  padding: 6rem 0;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: 4rem 0;
  }
`;

const SectionTitle = styled.h2`
  font-size: 2.5rem;
  text-align: center;
  margin-bottom: 4rem;
`;

const FaqContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FaqItem = styled.div`
  background: ${props => props.theme.colors.lightGray};
  border-radius: ${props => props.theme.radii.medium};
  overflow: hidden;
`;

const Question = styled(motion.div)`
  padding: 1.5rem;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1.2rem;
  font-weight: 600;
`;

const Answer = styled(motion.div)`
  padding: 0 1.5rem 1.5rem 1.5rem;
  font-size: 1rem;
  color: ${props => props.theme.colors.gray};
  line-height: 1.6;
`;

const faqs = [
  {
    question: '기존에 사용하던 데이터를 옮길 수 있나요?',
    answer: '네, 주요 협업 툴의 데이터는 저희 마이그레이션 전문가가 안전하게 이전해 드립니다. 자세한 내용은 문의해 주세요.',
  },
  {
    question: '보안은 안전한가요?',
    answer: 'WorkHub는 국제 표준 정보보호 인증(ISO 27001)을 획득했으며, 모든 데이터는 최고 수준으로 암호화되어 안전하게 관리됩니다.',
  },
  {
    question: '모바일 앱도 지원하나요?',
    answer: '네, iOS와 Android 앱을 모두 지원하여 언제 어디서든 업무를 처리할 수 있습니다. 앱 스토어에서 \'WorkHub\'를 검색하세요.',
  },
  {
    question: '특정 기능만 골라서 사용할 수도 있나요?',
    answer: 'Enterprise 플랜을 통해 원하시는 기능만 선택하여 구성하는 커스터마이징이 가능합니다. 영업팀에 문의하여 상담을 받아보세요.',
  },
];

const Accordion = ({ q, a }: { q: string; a: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <FaqItem>
      <Question onClick={() => setIsOpen(!isOpen)}>
        {q}
        {isOpen ? <FaMinus /> : <FaPlus />}
      </Question>
      <AnimatePresence>
        {isOpen && (
          <Answer
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          >
            {a}
          </Answer>
        )}
      </AnimatePresence>
    </FaqItem>
  );
};

const FaqSection = () => {
  return (
    <Section id="faq">
      <Container>
        <SectionTitle>자주 묻는 질문</SectionTitle>
        <FaqContainer>
          {faqs.map((faq, index) => (
            <Accordion key={index} q={faq.question} a={faq.answer} />
          ))}
        </FaqContainer>
      </Container>
    </Section>
  );
};

export default FaqSection;