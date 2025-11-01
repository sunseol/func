
import React from 'react';
import styled from 'styled-components';
import { Container } from '../components/Container';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/pagination';

const Section = styled.section`
  padding: 6rem 0;
  background-color: ${props => props.theme.colors.background};

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

const ReviewCard = styled.div`
  background: ${props => props.theme.colors.cardBg};
  padding: 3rem;
  border-radius: ${props => props.theme.radii.large};
  height: 400px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  border: 1px solid ${props => props.theme.colors.border};
`;

const Avatar = styled.img`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 1.5rem;
`;

const Quote = styled.p`
  font-size: 1.2rem;
  font-style: italic;
  line-height: 1.7;
  max-width: 600px;
  margin-bottom: 2rem;
  color: ${props => props.theme.colors.textSecondary};
`;

const Author = styled.p`
  font-weight: 600;
  color: ${props => props.theme.colors.primary};
`;

const StyledSwiper = styled(Swiper)`
  .swiper-pagination-bullet-active {
    background-color: ${props => props.theme.colors.primary};
  }
`;

const reviews = [
  {
    quote: 'FunCommute 도입 후 10개가 넘던 구독 툴을 모두 정리했습니다. 비용 절감은 물론, 팀원들이 업무 자체에 집중하는 시간이 훨씬 늘었어요.',
    author: '알파 프로젝트 CEO 김민준',
    avatar: 'https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  },
  {
    quote: '신입사원이 들어와도 걱정 없어요. FunCommute 안에 모든 업무 매뉴얼과 히스토리가 담겨있어 온보딩 과정이 정말 편해졌습니다.',
    author: '크리에이티브 스튜디오 인사팀장 박서연',
    avatar: 'https://images.pexels.com/photos/3772510/pexels-photo-3772510.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  },
  {
    quote: '흩어져 있던 모든 커뮤니케이션 채널이 하나로 통합되니, 중요한 정보를 놓치는 일이 사라졌습니다. 정말 강력 추천합니다!',
    author: '넥스트 커머스 마케팅팀 이지혜',
    avatar: 'https://images.pexels.com/photos/3772509/pexels-photo-3772509.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  },
];

const SocialProofSection = () => {
  return (
    <Section id="reviews">
      <Container>
        <SectionTitle>최고의 팀들이 FunCommute와 함께 성장하고 있습니다.</SectionTitle>
        <StyledSwiper
          modules={[Autoplay, Pagination]}
          spaceBetween={30}
          slidesPerView={1}
          pagination={{ clickable: true }}
          autoplay={{ delay: 5000, disableOnInteraction: false }}
          loop={true}
        >
          {reviews.map((review, index) => (
            <SwiperSlide key={index}>
              <ReviewCard>
                <Avatar src={review.avatar} alt={review.author} />
                <Quote>“{review.quote}”</Quote>
                <Author>- {review.author}</Author>
              </ReviewCard>
            </SwiperSlide>
          ))}
        </StyledSwiper>
      </Container>
    </Section>
  );
};

export default SocialProofSection;
