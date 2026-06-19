import { extendTheme } from '@chakra-ui/react';
import { colors, semanticTokens } from './colors';
import { components } from './components';
import { config, fonts, radii, shadows } from './foundations';
export const theme = extendTheme({ config, fonts, colors, semanticTokens, radii, shadows, components, styles:{global:{body:{bg:'appBg',color:'textMain'},'*':{scrollBehavior:'smooth'},'::selection':{bg:'brand.500',color:'white'}}} });
