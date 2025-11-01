
import React from 'react';
import styled from 'styled-components';

const FooterContainer = styled.footer`
  padding: 2rem;
  background-color: ${props => props.theme.colors.backgroundLight};
  text-align: center;
  color: ${props => props.theme.colors.textSecondary};
  border-top: 1px solid ${props => props.theme.colors.border};
`;

const Footer = () => {
  return (
    <FooterContainer>
      <p>© 2025 FunCommute. All rights reserved.</p>
    </FooterContainer>
  );
};

export default Footer;
