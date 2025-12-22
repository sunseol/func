import 'styled-components';

type AppTheme = typeof import('@/app/landing/styles/theme').theme;

declare module 'styled-components' {
  export interface DefaultTheme extends AppTheme {}
}

