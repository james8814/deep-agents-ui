/**
 * LoadingSpinner Component Tests
 * Tests for loading states, animations, and variants
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner, SkeletonLoader } from '../LoadingSpinner';

describe('LoadingSpinner Component', () => {
  describe('Rendering', () => {
    it('should render spinner variant by default', () => {
      render(<LoadingSpinner />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should render with default label', () => {
      render(<LoadingSpinner showLabel />);

      expect(screen.getByText('Loading')).toBeInTheDocument();
    });

    it('should render custom label', () => {
      render(<LoadingSpinner label="Processing..." showLabel />);

      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('should not show label when showLabel is false', () => {
      render(<LoadingSpinner label="Loading" showLabel={false} />);

      expect(screen.queryByText('Loading')).not.toBeInTheDocument();
    });

    it('should render spinner variant', () => {
      const { container } = render(<LoadingSpinner variant="spinner" />);

      const spinner = container.querySelector('[class*="animate-spin"]');
      expect(spinner).toBeInTheDocument();
    });

    it('should render dots variant', () => {
      const { container } = render(<LoadingSpinner variant="dots" />);

      const dots = container.querySelectorAll('[class*="animate-pulse"]');
      expect(dots.length).toBeGreaterThan(0);
    });

    it('should render pulse variant', () => {
      const { container } = render(<LoadingSpinner variant="pulse" />);

      const pulse = container.querySelector('[class*="animate-pulse"]');
      expect(pulse).toBeInTheDocument();
    });

    it('should render skeleton variant', () => {
      const { container } = render(<LoadingSpinner variant="skeleton" />);

      const skeleton = container.querySelector('[class*="animate-pulse"]');
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('should render small size', () => {
      const { container } = render(<LoadingSpinner size="sm" />);

      const spinner = container.querySelector('div');
      expect(spinner).toBeInTheDocument();
    });

    it('should render medium size', () => {
      const { container } = render(<LoadingSpinner size="md" />);

      const spinner = container.querySelector('div');
      expect(spinner).toBeInTheDocument();
    });

    it('should render large size', () => {
      const { container } = render(<LoadingSpinner size="lg" />);

      const spinner = container.querySelector('div');
      expect(spinner).toBeInTheDocument();
    });

    it('should render extra large size', () => {
      const { container } = render(<LoadingSpinner size="xl" />);

      const spinner = container.querySelector('div');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Full Screen Loading', () => {
    it('should render as overlay when fullScreen is true', () => {
      const { container } = render(<LoadingSpinner fullScreen />);

      const overlay = container.querySelector('[class*="fixed"]');
      expect(overlay).toBeInTheDocument();
    });

    it('should use custom overlay opacity', () => {
      const { container } = render(
        <LoadingSpinner fullScreen overlayOpacity={0.7} />
      );

      const overlay = container.querySelector('[style*="rgba"]');
      expect(overlay).toBeInTheDocument();
    });

    it('should have correct opacity value', () => {
      const { container } = render(
        <LoadingSpinner fullScreen overlayOpacity={0.3} />
      );

      const overlay = container.querySelector('div[style]');
      const style = overlay?.getAttribute('style');
      expect(style).toContain('0.3');
    });
  });

  describe('Centering', () => {
    it('should center content by default', () => {
      const { container } = render(<LoadingSpinner centered />);

      const centerDiv = container.querySelector('[class*="justify-center"]');
      expect(centerDiv).toBeInTheDocument();
    });

    it('should not center when centered is false', () => {
      const { container } = render(<LoadingSpinner centered={false} />);

      const centerDiv = container.querySelector('[class*="justify-center"]');
      expect(centerDiv).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper status role', () => {
      render(<LoadingSpinner />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should have descriptive text for screen readers', () => {
      render(<LoadingSpinner label="Uploading files" showLabel />);

      const srText = screen.getByText(/please wait/i);
      expect(srText).toHaveClass('sr-only');
    });

    it('should include label in screen reader text', () => {
      render(<LoadingSpinner label="Processing" showLabel />);

      expect(screen.getByText(/Processing.*please wait/i)).toBeInTheDocument();
    });

    it('should have aria-label equivalents', () => {
      render(<LoadingSpinner />);

      const status = screen.getByRole('status');
      expect(status).toBeInTheDocument();
    });
  });

  describe('Custom Color', () => {
    it('should accept custom color prop', () => {
      const { container } = render(
        <LoadingSpinner color="rgb(255, 0, 0)" />
      );

      expect(container.querySelector('div')).toBeInTheDocument();
    });

    it('should apply color to spinner', () => {
      const { container } = render(
        <LoadingSpinner variant="spinner" color="blue" />
      );

      const spinner = container.querySelector('[style*="borderColor"]');
      expect(spinner).toBeInTheDocument();
    });

    it('should apply color to dots variant', () => {
      const { container } = render(
        <LoadingSpinner variant="dots" color="green" />
      );

      const dots = container.querySelectorAll('[style*="backgroundColor"]');
      expect(dots.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long labels', () => {
      const longLabel = 'A'.repeat(200);
      render(<LoadingSpinner label={longLabel} showLabel />);

      expect(screen.getByText(longLabel)).toBeInTheDocument();
    });

    it('should handle special characters in labels', () => {
      render(
        <LoadingSpinner label="Loading... (50%)" showLabel />
      );

      expect(screen.getByText(/Loading.*50%/)).toBeInTheDocument();
    });

    it('should handle rapid variant changes', () => {
      const { rerender } = render(<LoadingSpinner variant="spinner" />);

      rerender(<LoadingSpinner variant="dots" />);
      rerender(<LoadingSpinner variant="pulse" />);
      rerender(<LoadingSpinner variant="skeleton" />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });
});

describe('SkeletonLoader Component', () => {
  describe('Rendering', () => {
    it('should render default skeleton lines', () => {
      const { container } = render(<SkeletonLoader />);

      const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBe(3); // Default count
    });

    it('should render custom count of lines', () => {
      const { container } = render(<SkeletonLoader count={5} />);

      const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBe(5);
    });

    it('should render single skeleton line', () => {
      const { container } = render(<SkeletonLoader count={1} />);

      const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBe(1);
    });

    it('should render many skeleton lines', () => {
      const { container } = render(<SkeletonLoader count={20} />);

      const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBe(20);
    });
  });

  describe('Customization', () => {
    it('should apply custom height', () => {
      const { container } = render(<SkeletonLoader height="h-10" />);

      const skeleton = container.querySelector('[class*="h-10"]');
      expect(skeleton).toBeInTheDocument();
    });

    it('should apply custom width', () => {
      const { container } = render(<SkeletonLoader width="w-1/2" />);

      const skeleton = container.querySelector('[class*="w-1/2"]');
      expect(skeleton).toBeInTheDocument();
    });

    it('should apply custom gap', () => {
      const { container } = render(<SkeletonLoader gap="gap-4" />);

      const skeletonContainer = container.querySelector('[class*="gap-4"]');
      expect(skeletonContainer).toBeInTheDocument();
    });

    it('should apply custom border radius', () => {
      const { container } = render(<SkeletonLoader rounded="rounded-lg" />);

      const skeleton = container.querySelector('[class*="rounded-lg"]');
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe('Animation', () => {
    it('should have pulsing animation', () => {
      const { container } = render(<SkeletonLoader />);

      const skeleton = container.querySelector('[class*="animate-pulse"]');
      expect(skeleton).toBeInTheDocument();
    });

    it('should maintain animation across all lines', () => {
      const { container } = render(<SkeletonLoader count={5} />);

      const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
      skeletons.forEach(skeleton => {
        expect(skeleton).toHaveClass('animate-pulse');
      });
    });
  });

  describe('Accessibility', () => {
    it('should not have role=status (skeleton is not a status)', () => {
      const { container } = render(<SkeletonLoader />);

      expect(container.querySelector('[role="status"]')).not.toBeInTheDocument();
    });

    it('should use aria-label for context when needed', () => {
      // SkeletonLoader doesn't have built-in aria-label, but parent can add it
      const { container } = render(
        <div aria-label="Loading user profile">
          <SkeletonLoader />
        </div>
      );

      expect(container.querySelector('[aria-label]')).toBeInTheDocument();
    });
  });

  describe('Layout Matching', () => {
    it('should render in correct spacing for list item placeholders', () => {
      const { container } = render(
        <SkeletonLoader
          count={3}
          height="h-12"
          gap="gap-3"
          width="w-full"
        />
      );

      const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBe(3);
      skeletons.forEach(s => {
        expect(s).toHaveClass('h-12', 'w-full');
      });
    });

    it('should render in correct spacing for text placeholders', () => {
      const { container } = render(
        <SkeletonLoader
          count={2}
          height="h-4"
          gap="gap-2"
          width="w-full"
        />
      );

      const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBe(2);
    });
  });
});
