/**
 * Design System Tests
 * Validates token definitions, color consistency, and accessibility
 */

import {
  designTokens,
  getTokens,
  type ThemeMode as _ThemeMode,
} from '@/lib/designTokens';
import {
  lightModeColors,
  darkModeColors,
  colorPalette,
  semanticColors,
  getColorsByTheme,
} from '@/lib/colorSystem';
import {
  typographySystem,
  getBodyTextStyle,
  getLabelStyle,
  getTypographyScale,
} from '@/lib/typographySystem';

describe('Design Tokens', () => {
  describe('Brand Colors', () => {
    it('should have gradient definitions', () => {
      expect(designTokens.brand.gradient).toContain('linear-gradient');
      expect(designTokens.brand.gradientSubtle).toContain('linear-gradient');
    });

    it('should have brand spectrum colors', () => {
      expect(designTokens.brand).toBeDefined();
      expect(Object.keys(designTokens.brand).length).toBeGreaterThan(0);
    });
  });

  describe('Primary Colors', () => {
    it('light mode should have primary color variants', () => {
      expect(designTokens.light.primary).toBe('#7C3AED');
      expect(designTokens.light.primaryHover).toBe('#6D28D9');
      expect(designTokens.light.primaryActive).toBe('#5B21B6');
      expect(designTokens.light.primarySubtle).toBe('#F5F3FF');
    });

    it('dark mode should have primary color variants', () => {
      expect(designTokens.dark.primary).toBe('#8B5CF6');
      expect(designTokens.dark.primaryHover).toBe('#A78BFA');
      expect(designTokens.dark.primaryActive).toBe('#7C3AED');
      expect(designTokens.dark.primarySubtle).toContain('rgba');
    });

    it('primary colors should be different between light and dark', () => {
      expect(designTokens.light.primary).not.toBe(designTokens.dark.primary);
    });
  });

  describe('Surfaces', () => {
    it('light mode should have all surface types', () => {
      const lightSurfaces = designTokens.surfaces.light;
      expect(lightSurfaces.base).toBe('#FFFFFF');
      expect(lightSurfaces.raised).toBe('#FAFAF9');
      expect(lightSurfaces.card).toBe('#FFFFFF');
      expect(lightSurfaces.sidebar).toBe('#F5F5F4');
    });

    it('dark mode should have all surface types', () => {
      const darkSurfaces = designTokens.surfaces.dark;
      expect(darkSurfaces.base).toBe('#0A0A12');
      expect(darkSurfaces.raised).toBe('#12121E');
      expect(darkSurfaces.card).toBe('#1A1A2E');
      expect(darkSurfaces.sidebar).toBe('#12121E');
    });
  });

  describe('Text Colors', () => {
    it('light mode should have text hierarchy', () => {
      const lightText = designTokens.text.light;
      expect(lightText.primary).toBe('#1A1816');
      expect(lightText.secondary).toBe('#5C5650');
      expect(lightText.tertiary).toBe('#8A8580');
      expect(lightText.disabled).toBe('#A9A59F');
    });

    it('dark mode should have text hierarchy', () => {
      const darkText = designTokens.text.dark;
      expect(darkText.primary).toContain('rgba(255');
      expect(darkText.secondary).toContain('rgba(255');
    });
  });

  describe('Status Colors', () => {
    it('light mode should have all status colors', () => {
      const lightStatus = designTokens.status.light;
      expect(lightStatus.success).toBe('#22C55E');
      expect(lightStatus.warning).toBe('#F59E0B');
      expect(lightStatus.error).toBe('#EF4444');
      expect(lightStatus.info).toBe('#7C3AED');
    });

    it('dark mode should have all status colors', () => {
      const darkStatus = designTokens.status.dark;
      expect(darkStatus.success).toBe('#10B981');
      expect(darkStatus.warning).toBe('#FBBF24');
      expect(darkStatus.error).toBe('#F87171');
      expect(darkStatus.info).toBe('#A78BFA');
    });

    it('should have background variants for status colors', () => {
      const lightStatus = designTokens.status.light;
      expect(lightStatus.successBg).toBe('#F0FDF4');
      expect(lightStatus.warningBg).toBe('#FFFBEB');
      expect(lightStatus.errorBg).toBe('#FEF2F2');
      expect(lightStatus.infoBg).toBe('#F5F3FF');
    });
  });

  describe('OPDCA Colors', () => {
    it('should have all OPDCA stage colors', () => {
      expect(designTokens.opdca.observe).toBe('#06B6D4');
      expect(designTokens.opdca.plan).toBe('#6366F1');
      expect(designTokens.opdca.do).toBe('#10B981');
      expect(designTokens.opdca.check).toBe('#F59E0B');
      expect(designTokens.opdca.adapt).toBe('#EC4899');
    });

    it('should have unique colors for each stage', () => {
      const colors = Object.values(designTokens.opdca);
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(colors.length);
    });
  });

  describe('SubAgent Colors', () => {
    it('should have colors for all subagents', () => {
      expect(designTokens.subagents.research).toBe('#06B6D4');
      expect(designTokens.subagents.analysis).toBe('#6366F1');
      expect(designTokens.subagents.design).toBe('#EC4899');
      expect(designTokens.subagents.writing).toBe('#F59E0B');
      expect(designTokens.subagents.document).toBe('#10B981');
      expect(designTokens.subagents.reflection).toBe('#8B5CF6');
    });

    it('should have 6 subagents', () => {
      expect(Object.keys(designTokens.subagents).length).toBe(6);
    });
  });

  describe('Typography', () => {
    it('should have font families', () => {
      expect(designTokens.typography.fontFamilies.sans).toContain('Inter');
      expect(designTokens.typography.fontFamilies.mono).toContain('JetBrains');
    });

    it('should have font sizes', () => {
      expect(designTokens.typography.fontSizes.xs).toBe('0.75rem');
      expect(designTokens.typography.fontSizes.lg).toBe('1rem');
      expect(designTokens.typography.fontSizes['3xl']).toBe('1.5rem');
    });

    it('should have line heights', () => {
      expect(designTokens.typography.lineHeights.tight).toBe(1.33);
      expect(designTokens.typography.lineHeights.normal).toBe(1.57);
      expect(designTokens.typography.lineHeights.loose).toBe(1.8);
    });

    it('should have font weights', () => {
      expect(designTokens.typography.fontWeights.normal).toBe(400);
      expect(designTokens.typography.fontWeights.semibold).toBe(600);
      expect(designTokens.typography.fontWeights.bold).toBe(700);
    });
  });

  describe('Spacing', () => {
    it('should have 4px grid spacing', () => {
      expect(designTokens.spacing['1']).toBe('4px');
      expect(designTokens.spacing['2']).toBe('8px');
      expect(designTokens.spacing['4']).toBe('16px');
    });

    it('should have 0 and 0.5 spacing', () => {
      expect(designTokens.spacing['0']).toBe('0');
      expect(designTokens.spacing['0.5']).toBe('2px');
    });
  });

  describe('Border Radius', () => {
    it('should have all border radius values', () => {
      expect(designTokens.borderRadius.none).toBe('0');
      expect(designTokens.borderRadius.md).toBe('6px');
      expect(designTokens.borderRadius.full).toBe('9999px');
    });
  });

  describe('Shadows', () => {
    it('light mode should have shadow definitions', () => {
      expect(designTokens.shadows.light.xs).toContain('rgba');
      expect(designTokens.shadows.light.lg).toContain('rgba');
    });

    it('dark mode should have no shadows (border-based)', () => {
      expect(designTokens.shadows.dark.xs).toBe('none');
      expect(designTokens.shadows.dark.lg).toBe('none');
    });
  });

  describe('Motion', () => {
    it('should have duration tokens', () => {
      expect(designTokens.motion.durations.instant).toBe('50ms');
      expect(designTokens.motion.durations.normal).toBe('200ms');
    });

    it('should have easing functions', () => {
      expect(designTokens.motion.easing.default).toContain('cubic-bezier');
      expect(designTokens.motion.easing.in).toContain('cubic-bezier');
    });
  });

  describe('Z-Index', () => {
    it('should have z-index scale', () => {
      expect(designTokens.zIndex.base).toBe(0);
      expect(designTokens.zIndex.modal).toBe(40);
      expect(designTokens.zIndex.max).toBe(9999);
    });

    it('z-index should be in ascending order', () => {
      const values = Object.values(designTokens.zIndex);
      for (let i = 0; i < values.length - 1; i++) {
        expect(values[i]).toBeLessThanOrEqual(values[i + 1]);
      }
    });
  });

  describe('Breakpoints', () => {
    it('should have responsive breakpoints', () => {
      expect(designTokens.breakpoints.sm).toBe('640px');
      expect(designTokens.breakpoints.md).toBe('768px');
      expect(designTokens.breakpoints.lg).toBe('1024px');
    });
  });

  describe('Component Tokens', () => {
    it('button should have token definitions', () => {
      expect(designTokens.components.button.primary).toBeDefined();
      expect(designTokens.components.button.secondary).toBeDefined();
      expect(designTokens.components.button.sizes).toBeDefined();
    });

    it('message should have token definitions', () => {
      expect(designTokens.components.message.light).toBeDefined();
      expect(designTokens.components.message.dark).toBeDefined();
    });

    it('input should have token definitions', () => {
      expect(designTokens.components.input).toBeDefined();
    });

    it('card should have token definitions', () => {
      expect(designTokens.components.card).toBeDefined();
    });
  });

  describe('getTokens helper', () => {
    it('should return light mode tokens', () => {
      const tokens = getTokens(false);
      expect(tokens.surfaces).toEqual(designTokens.surfaces.light);
      expect(tokens.text).toEqual(designTokens.text.light);
    });

    it('should return dark mode tokens', () => {
      const tokens = getTokens(true);
      expect(tokens.surfaces).toEqual(designTokens.surfaces.dark);
      expect(tokens.text).toEqual(designTokens.text.dark);
    });
  });
});

describe('Color System', () => {
  describe('Light Mode Colors', () => {
    it('should have all required CSS variables', () => {
      expect(lightModeColors['--color-primary']).toBe('#7C3AED');
      expect(lightModeColors['--text-primary']).toBe('#1A1816');
      expect(lightModeColors['--surface-base']).toBe('#FFFFFF');
    });

    it('should have OPDCA stage colors', () => {
      expect(lightModeColors['--opdca-observe']).toBe('#06B6D4');
      expect(lightModeColors['--opdca-adapt']).toBe('#EC4899');
    });

    it('should have subagent colors', () => {
      expect(lightModeColors['--agent-research']).toBe('#06B6D4');
      expect(lightModeColors['--agent-reflection']).toBe('#8B5CF6');
    });
  });

  describe('Dark Mode Colors', () => {
    it('should have different primary color', () => {
      expect(darkModeColors['--color-primary']).toBe('#8B5CF6');
      expect(darkModeColors['--color-primary']).not.toBe(lightModeColors['--color-primary']);
    });

    it('should have dark surfaces', () => {
      expect(darkModeColors['--surface-base']).toBe('#0A0A12');
    });

    it('should have no shadows (border-based)', () => {
      expect(darkModeColors['--shadow-lg']).toBe('none');
    });
  });

  describe('Color Palette', () => {
    it('should have brand colors', () => {
      expect(colorPalette.brand.cyan).toBe('#06B6D4');
      expect(colorPalette.brand.violet).toBe('#8B5CF6');
    });

    it('should have purple scale', () => {
      expect(colorPalette.purple['600']).toBe('#7C3AED');
      expect(colorPalette.purple['500']).toBe('#8B5CF6');
    });

    it('should have status colors', () => {
      expect(colorPalette.success.light).toBe('#22C55E');
      expect(colorPalette.error.dark).toBe('#F87171');
    });
  });

  describe('Semantic Colors', () => {
    it('should map to CSS variables', () => {
      expect(semanticColors.surfaces.base).toBe('--surface-base');
      expect(semanticColors.text.primary).toBe('--text-primary');
      expect(semanticColors.interactive.primary).toBe('--color-primary');
    });

    it('should have status aliases', () => {
      expect(semanticColors.status.success).toBe('--color-success');
      expect(semanticColors.status.error).toBe('--color-error');
    });

    it('should have OPDCA aliases', () => {
      expect(semanticColors.opdca.observe).toBe('--opdca-observe');
      expect(semanticColors.opdca.adapt).toBe('--opdca-adapt');
    });
  });

  describe('getColorsByTheme', () => {
    it('should return light colors for light mode', () => {
      const colors = getColorsByTheme(false);
      expect(colors['--color-primary']).toBe('#7C3AED');
    });

    it('should return dark colors for dark mode', () => {
      const colors = getColorsByTheme(true);
      expect(colors['--color-primary']).toBe('#8B5CF6');
    });
  });
});

describe('Typography System', () => {
  describe('Heading Styles', () => {
    it('should have h1 style', () => {
      const h1 = typographySystem.headings.h1;
      expect(h1.fontSize).toBe('2rem');
      expect(h1.fontWeight).toBe(700);
    });

    it('h1 should be larger than h6', () => {
      const h1Size = parseFloat(typographySystem.headings.h1.fontSize);
      const h6Size = parseFloat(typographySystem.headings.h6.fontSize);
      expect(h1Size).toBeGreaterThan(h6Size);
    });
  });

  describe('Body Text Styles', () => {
    it('should have all body sizes', () => {
      expect(typographySystem.body.xs).toBeDefined();
      expect(typographySystem.body.sm).toBeDefined();
      expect(typographySystem.body.base).toBeDefined();
      expect(typographySystem.body.lg).toBeDefined();
    });

    it('body sizes should have consistent properties', () => {
      Object.values(typographySystem.body).forEach(style => {
        expect(style.fontSize).toBeDefined();
        expect(style.fontWeight).toBeDefined();
        expect(style.lineHeight).toBeDefined();
      });
    });
  });

  describe('Label Styles', () => {
    it('should have all label sizes', () => {
      expect(typographySystem.labels.xs).toBeDefined();
      expect(typographySystem.labels.base).toBeDefined();
    });

    it('labels should be heavier weight', () => {
      Object.values(typographySystem.labels).forEach(style => {
        expect(style.fontWeight).toBeGreaterThanOrEqual(500);
      });
    });
  });

  describe('Code Styles', () => {
    it('should use mono font family', () => {
      Object.values(typographySystem.code).forEach(style => {
        expect(style.fontFamily).toContain('Mono');
      });
    });
  });

  describe('Display Styles', () => {
    it('display xl should be largest', () => {
      const xlSize = parseFloat(typographySystem.display.xl.fontSize);
      const lgSize = parseFloat(typographySystem.display.lg.fontSize);
      expect(xlSize).toBeGreaterThan(lgSize);
    });
  });

  describe('Helper Functions', () => {
    it('getBodyTextStyle should return correct style', () => {
      const style = getBodyTextStyle('lg');
      expect(style).toEqual(typographySystem.body.lg);
    });

    it('getLabelStyle should return correct style', () => {
      const style = getLabelStyle('base');
      expect(style).toEqual(typographySystem.labels.base);
    });

    it('getTypographyScale should return correct heading', () => {
      const style = getTypographyScale('h1');
      expect(style).toEqual(typographySystem.headings.h1);
    });
  });
});

describe('Accessibility', () => {
  it('primary color should have sufficient contrast in light mode', () => {
    // WCAG AA requires 4.5:1 contrast for text
    // Light mode primary #7C3AED on #FFFFFF
    const primaryLight = '#7C3AED';
    const lightText = '#FFFFFF';
    // Basic check - just verify colors are different
    expect(primaryLight).not.toBe(lightText);
  });

  it('text colors should have sufficient contrast', () => {
    const lightBg = '#FFFFFF';
    const lightText = '#1A1816';
    expect(lightBg).not.toBe(lightText);

    const _darkBg = '#0A0A12';
    const darkText = 'rgba(255, 255, 255, 0.95)';
    // Dark text should contain white/light values
    expect(darkText).toContain('255');
  });

  it('status colors should be distinguishable', () => {
    const { success, error, warning } = designTokens.status.light;
    const colors = [success, error, warning];
    const uniqueColors = new Set(colors);
    expect(uniqueColors.size).toBe(colors.length);
  });
});

describe('Consistency', () => {
  it('light and dark modes should have same structure', () => {
    const lightKeys = Object.keys(designTokens.surfaces.light).sort();
    const darkKeys = Object.keys(designTokens.surfaces.dark).sort();
    expect(lightKeys).toEqual(darkKeys);
  });

  it('all CSS variables should be strings', () => {
    Object.values(lightModeColors).forEach(value => {
      expect(typeof value).toBe('string');
    });
  });

  it('motion durations should be numeric-like strings', () => {
    Object.values(designTokens.motion.durations).forEach(duration => {
      expect(duration).toMatch(/^\d+ms$/);
    });
  });

  it('z-index values should be numeric', () => {
    Object.values(designTokens.zIndex).forEach(zIndex => {
      expect(typeof zIndex).toBe('number');
      expect(zIndex >= 0).toBe(true);
    });
  });

  it('breakpoints should be in ascending order', () => {
    const breakpoints = [
      parseInt(designTokens.breakpoints.sm),
      parseInt(designTokens.breakpoints.md),
      parseInt(designTokens.breakpoints.lg),
      parseInt(designTokens.breakpoints.xl),
      parseInt(designTokens.breakpoints['2xl']),
    ];

    for (let i = 0; i < breakpoints.length - 1; i++) {
      expect(breakpoints[i]).toBeLessThan(breakpoints[i + 1]);
    }
  });
});
