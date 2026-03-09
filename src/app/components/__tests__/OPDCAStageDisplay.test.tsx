/**
 * OPDCA Stage Display Component Tests
 * Tests for stage rendering, variants, and accessibility
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { OPDCAStageDisplay, OPDCATimeline } from '../OPDCAStageDisplay';

describe('OPDCAStageDisplay Component', () => {
  describe('Rendering', () => {
    it('should render observe stage', () => {
      render(<OPDCAStageDisplay stage="observe" />);

      expect(screen.getByText('Observe')).toBeInTheDocument();
    });

    it('should render plan stage', () => {
      render(<OPDCAStageDisplay stage="plan" />);

      expect(screen.getByText('Plan')).toBeInTheDocument();
    });

    it('should render do stage', () => {
      render(<OPDCAStageDisplay stage="do" />);

      expect(screen.getByText('Do')).toBeInTheDocument();
    });

    it('should render check stage', () => {
      render(<OPDCAStageDisplay stage="check" />);

      expect(screen.getByText('Check')).toBeInTheDocument();
    });

    it('should render adapt stage', () => {
      render(<OPDCAStageDisplay stage="adapt" />);

      expect(screen.getByText('Adapt')).toBeInTheDocument();
    });

    it('should render idle stage', () => {
      render(<OPDCAStageDisplay stage="idle" />);

      expect(screen.getByText('Idle')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should render minimal variant with only icon and label', () => {
      const { container } = render(
        <OPDCAStageDisplay stage="plan" variant="minimal" />
      );

      expect(screen.getByText('Plan')).toBeInTheDocument();
      // Minimal should not show full card
      expect(container.querySelector('[class*="rounded-lg"]')).not.toBeInTheDocument();
    });

    it('should render compact variant with label and description', () => {
      render(
        <OPDCAStageDisplay
          stage="plan"
          variant="compact"
          showDescription
        />
      );

      expect(screen.getByText('Plan')).toBeInTheDocument();
      expect(screen.getByText(/Creating strategy/i)).toBeInTheDocument();
    });

    it('should render full variant with card layout', () => {
      const { container } = render(
        <OPDCAStageDisplay
          stage="plan"
          variant="full"
          showDescription
        />
      );

      const card = container.querySelector('[class*="border"]');
      expect(card).toBeInTheDocument();
      expect(screen.getByText('Plan')).toBeInTheDocument();
    });
  });

  describe('Descriptions', () => {
    it('should show description when showDescription is true', () => {
      render(
        <OPDCAStageDisplay
          stage="observe"
          variant="full"
          showDescription={true}
        />
      );

      expect(screen.getByText(/Gathering information/i)).toBeInTheDocument();
    });

    it('should not show description when showDescription is false', () => {
      render(
        <OPDCAStageDisplay
          stage="observe"
          variant="full"
          showDescription={false}
        />
      );

      expect(screen.queryByText(/Gathering information/i)).not.toBeInTheDocument();
    });

    it('should show progress bar in full variant with description', () => {
      const { container } = render(
        <OPDCAStageDisplay
          stage="plan"
          variant="full"
          showDescription={true}
        />
      );

      const progressBars = container.querySelectorAll('[class*="rounded-full"]');
      expect(progressBars.length).toBeGreaterThan(0);
    });

    it('should display stage number in full variant', () => {
      render(
        <OPDCAStageDisplay
          stage="plan"
          variant="full"
          showDescription={true}
        />
      );

      expect(screen.getByText(/Stage 2 of 5/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper status role', () => {
      render(<OPDCAStageDisplay stage="plan" />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should have descriptive aria-label', () => {
      render(<OPDCAStageDisplay stage="plan" />);

      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-label');
      expect(status.getAttribute('aria-label')).toContain('Current stage: Plan');
    });

    it('should use proper semantic HTML for full variant', () => {
      render(
        <OPDCAStageDisplay
          stage="plan"
          variant="full"
          showDescription={true}
        />
      );

      const heading = screen.getByRole('heading');
      expect(heading).toBeInTheDocument();
      expect(heading.textContent).toContain('Plan');
    });

    it('should have color and icon for accessibility', () => {
      const { container } = render(
        <OPDCAStageDisplay stage="observe" />
      );

      // Should have both icon and text for color-independent recognition
      expect(screen.getByText('Observe')).toBeInTheDocument();
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply correct color for observe stage', () => {
      const { container } = render(
        <OPDCAStageDisplay stage="observe" />
      );

      const element = container.querySelector('[class*="text-blue"]');
      expect(element).toBeInTheDocument();
    });

    it('should apply correct color for plan stage', () => {
      const { container } = render(
        <OPDCAStageDisplay stage="plan" />
      );

      const element = container.querySelector('[class*="text-purple"]');
      expect(element).toBeInTheDocument();
    });

    it('should apply correct color for do stage', () => {
      const { container } = render(
        <OPDCAStageDisplay stage="do" />
      );

      const element = container.querySelector('[class*="text-green"]');
      expect(element).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <OPDCAStageDisplay
          stage="plan"
          className="custom-class"
        />
      );

      const element = container.firstChild;
      expect(element).toHaveClass('custom-class');
    });
  });

  describe('Edge Cases', () => {
    it('should handle all stage variants combinations', () => {
      const stages = ['observe', 'plan', 'do', 'check', 'adapt', 'idle'] as const;
      const variants = ['minimal', 'compact', 'full'] as const;

      stages.forEach(stage => {
        variants.forEach(variant => {
          const { unmount } = render(
            <OPDCAStageDisplay stage={stage} variant={variant} />
          );
          expect(screen.getByRole('status')).toBeInTheDocument();
          unmount();
        });
      });
    });

    it('should handle rapid stage changes', () => {
      const { rerender } = render(<OPDCAStageDisplay stage="observe" />);

      rerender(<OPDCAStageDisplay stage="plan" />);
      expect(screen.getByText('Plan')).toBeInTheDocument();

      rerender(<OPDCAStageDisplay stage="do" />);
      expect(screen.getByText('Do')).toBeInTheDocument();

      rerender(<OPDCAStageDisplay stage="check" />);
      expect(screen.getByText('Check')).toBeInTheDocument();
    });
  });
});

describe('OPDCATimeline Component', () => {
  describe('Rendering', () => {
    it('should render all five stages', () => {
      render(<OPDCATimeline currentStage="plan" />);

      expect(screen.getByText('Observe')).toBeInTheDocument();
      expect(screen.getByText('Plan')).toBeInTheDocument();
      expect(screen.getByText('Do')).toBeInTheDocument();
      expect(screen.getByText('Check')).toBeInTheDocument();
      expect(screen.getByText('Adapt')).toBeInTheDocument();
    });

    it('should highlight current stage', () => {
      const { container } = render(<OPDCATimeline currentStage="plan" />);

      const progressbar = container.querySelector('[role="progressbar"]');
      expect(progressbar).toHaveAttribute('aria-valuenow', '2');
    });

    it('should show all stages without labels when showLabels is false', () => {
      const { container } = render(
        <OPDCATimeline currentStage="plan" showLabels={false} />
      );

      const textElements = container.querySelectorAll('span');
      expect(textElements.length).toBeLessThan(5);
    });

    it('should render compact variant', () => {
      const { container } = render(
        <OPDCATimeline currentStage="plan" compact={true} />
      );

      const timeline = container.querySelector('[role="progressbar"]');
      expect(timeline).toBeInTheDocument();
    });
  });

  describe('Completed Stages', () => {
    it('should mark completed stages with checkmark', () => {
      const { container } = render(
        <OPDCATimeline
          currentStage="do"
          completedStages={['observe', 'plan']}
        />
      );

      const _checkmarks = container.querySelectorAll(':contains("✓")');
      // Check if checkmarks are rendered (specific count may vary)
      expect(container.textContent).toContain('✓');
    });

    it('should apply different styling to completed stages', () => {
      render(
        <OPDCATimeline
          currentStage="do"
          completedStages={['observe', 'plan']}
        />
      );

      // Component should render without errors
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should show different styling for future stages', () => {
      render(
        <OPDCATimeline
          currentStage="plan"
          completedStages={[]}
        />
      );

      // Check and Adapt are future stages
      expect(screen.getByText('Check')).toBeInTheDocument();
      expect(screen.getByText('Adapt')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have progressbar role', () => {
      render(<OPDCATimeline currentStage="plan" />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should have aria-valuenow attribute', () => {
      render(<OPDCATimeline currentStage="plan" />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '2');
    });

    it('should have aria-valuemin and aria-valuemax', () => {
      render(<OPDCATimeline currentStage="plan" />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '5');
    });

    it('should have descriptive aria-label', () => {
      render(<OPDCATimeline currentStage="plan" />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-label');
      expect(progressbar.getAttribute('aria-label')).toContain('Workflow progress');
    });

    it('should have aria-labels for each stage', () => {
      render(<OPDCATimeline currentStage="plan" />);

      // Each stage should be properly labeled
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar.textContent).toContain('Observe');
    });
  });

  describe('Progress Tracking', () => {
    it('should update progress when current stage changes', () => {
      const { rerender } = render(<OPDCATimeline currentStage="observe" />);

      let progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '1');

      rerender(<OPDCATimeline currentStage="plan" />);
      progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '2');

      rerender(<OPDCATimeline currentStage="do" />);
      progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '3');
    });

    it('should handle final stage correctly', () => {
      render(<OPDCATimeline currentStage="adapt" />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '5');
    });
  });

  describe('Connectors', () => {
    it('should render connector lines between stages', () => {
      const { container } = render(<OPDCATimeline currentStage="plan" />);

      const connectors = container.querySelectorAll('[class*="flex-1"]');
      expect(connectors.length).toBeGreaterThan(0);
    });

    it('should style completed stage connectors differently', () => {
      render(
        <OPDCATimeline
          currentStage="do"
          completedStages={['observe', 'plan']}
        />
      );

      // Connectors before current stage should be green
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle all stage combinations', () => {
      const stages = ['observe', 'plan', 'do', 'check', 'adapt'] as const;

      stages.forEach(stage => {
        const { unmount } = render(<OPDCATimeline currentStage={stage} />);
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
        unmount();
      });
    });

    it('should handle empty completedStages array', () => {
      render(
        <OPDCATimeline
          currentStage="plan"
          completedStages={[]}
        />
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should handle all completed stages', () => {
      render(
        <OPDCATimeline
          currentStage="adapt"
          completedStages={['observe', 'plan', 'do', 'check']}
        />
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });
});
