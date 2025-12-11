
import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { Link } from 'react-scroll';
import { FaBars, FaTimes } from 'react-icons/fa';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const HeaderContainer = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  padding: 1rem 2rem;
  background: rgba(17, 24, 39, 0.95);
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 1000;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const Logo = styled(Link)`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${props => props.theme.colors.primary};
  cursor: pointer;
`;

const Nav = styled.nav`
  display: flex;
  gap: 1.5rem;
  align-items: center;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    display: none;
  }
`;

const LoginButton = styled.button`
  padding: 0.5rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: white;
  background-color: ${props => props.theme.colors.primary};
  border: none;
  border-radius: ${props => props.theme.radii.pill};
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  }
`;

const NavLink = styled(Link)`
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  position: relative;
  padding-bottom: 5px;
  color: ${props => props.theme.colors.text};

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 0;
    height: 2px;
    background-color: ${props => props.theme.colors.primary};
    transition: width 0.3s ease;
  }

  &:hover::after, &.active::after {
    width: 100%;
  }
`;

const MobileIcon = styled.div`
  display: none;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    display: block;
    font-size: 1.8rem;
    cursor: pointer;
    color: ${props => props.theme.colors.text};
  }
`;

const MobileNav = styled.div<{ $isOpen: boolean }>`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 2rem;
  background: ${props => props.theme.colors.background};
  position: fixed;
  top: 0;
  left: ${props => (props.$isOpen ? '0' : '-100%')};
  width: 100%;
  height: 100vh;
  transition: left 0.3s ease-in-out;
  z-index: 999;
`;

const MobileNavLink = styled(NavLink)`
  font-size: 2rem;
`;

const navItems = [
  { to: 'features', label: '기능 소개' },
  { to: 'reviews', label: '고객 후기' },
  { to: 'pricing', label: '요금안내' },
  { to: 'faq', label: '자주 묻는 질문' },
];

const ReportButton = styled.button`
  padding: 0.5rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: white;
  background-color: ${props => props.theme.colors.primary};
  border: none;
  border-radius: ${props => props.theme.radii.pill};
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  margin-left: 1rem;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(16, 185, 129, 0.4);
  }
`;

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.replace('/landing');
  }, [signOut, router]);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <>
      <HeaderContainer>
        <NextLink href="/landing" className="no-underline text-inherit cursor-pointer">
          <Logo as="div" style={{ cursor: 'pointer' }}>FunCommute</Logo>
        </NextLink>
        <Nav>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              smooth={true}
              duration={500}
              spy={true}
              offset={-80}
              activeClass="active"
            >
              {item.label}
            </NavLink>
          ))}
          {user ? (
            <ReportButton onClick={() => router.push('/')}>보고서 작성</ReportButton>
          ) : (
            <NextLink href="/login" className="no-underline text-inherit">
              <ReportButton as="span">보고서 작성</ReportButton>
            </NextLink>
          )}
          {user ? (
            <LoginButton onClick={handleSignOut}>로그아웃</LoginButton>
          ) : (
            <NextLink href="/login" className="no-underline text-inherit">
              <LoginButton>로그인</LoginButton>
            </NextLink>
          )}
        </Nav>
        <MobileIcon onClick={toggleMenu}>
          {isOpen ? <FaTimes /> : <FaBars />}
        </MobileIcon>
      </HeaderContainer>
      <MobileNav $isOpen={isOpen}>
        {navItems.map(item => (
          <MobileNavLink
            key={item.to}
            to={item.to}
            smooth={true}
            duration={500}
            spy={true}
            offset={-80}
            activeClass="active"
            onClick={closeMenu}
          >
            {item.label}
          </MobileNavLink>
        ))}
        {user ? (
          <ReportButton onClick={() => { router.push('/'); closeMenu(); }}>보고서 작성</ReportButton>
        ) : (
          <NextLink href="/login" className="no-underline text-inherit" onClick={closeMenu}>
            <ReportButton as="span">보고서 작성</ReportButton>
          </NextLink>
        )}
        {user ? (
          <LoginButton onClick={() => { handleSignOut(); closeMenu(); }}>로그아웃</LoginButton>
        ) : (
          <NextLink href="/login" className="no-underline text-inherit" onClick={closeMenu}>
            <LoginButton>로그인</LoginButton>
          </NextLink>
        )}
      </MobileNav>
    </>
  );
};

export default Header;
