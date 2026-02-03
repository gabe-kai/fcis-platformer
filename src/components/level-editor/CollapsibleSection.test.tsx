import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CollapsibleSection } from './CollapsibleSection';

describe('CollapsibleSection', () => {
  it('should render with title', () => {
    render(
      <CollapsibleSection title="Test Section">
        <div>Test content</div>
      </CollapsibleSection>
    );

    expect(screen.getByText('Test Section')).toBeInTheDocument();
  });

  it('should render content when expanded by default', () => {
    render(
      <CollapsibleSection title="Test Section" defaultExpanded={true}>
        <div>Test content</div>
      </CollapsibleSection>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should not render content when collapsed by default', () => {
    render(
      <CollapsibleSection title="Test Section" defaultExpanded={false}>
        <div>Test content</div>
      </CollapsibleSection>
    );

    expect(screen.queryByText('Test content')).not.toBeInTheDocument();
  });

  it('should toggle content on header click', () => {
    render(
      <CollapsibleSection title="Test Section" defaultExpanded={true}>
        <div>Test content</div>
      </CollapsibleSection>
    );

    // Content should be visible initially
    expect(screen.getByText('Test content')).toBeInTheDocument();

    // Click header to collapse
    fireEvent.click(screen.getByText('Test Section'));
    expect(screen.queryByText('Test content')).not.toBeInTheDocument();

    // Click header to expand
    fireEvent.click(screen.getByText('Test Section'));
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should auto-expand when autoExpand prop changes to true', async () => {
    const { rerender } = render(
      <CollapsibleSection title="Test Section" defaultExpanded={false} autoExpand={false}>
        <div>Test content</div>
      </CollapsibleSection>
    );

    // Content should not be visible initially
    expect(screen.queryByText('Test content')).not.toBeInTheDocument();

    // Change autoExpand to true - should expand
    rerender(
      <CollapsibleSection title="Test Section" defaultExpanded={false} autoExpand={true}>
        <div>Test content</div>
      </CollapsibleSection>
    );

    // Content should now be visible
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should not collapse when autoExpand changes from true to false', () => {
    const { rerender } = render(
      <CollapsibleSection title="Test Section" defaultExpanded={false} autoExpand={true}>
        <div>Test content</div>
      </CollapsibleSection>
    );

    // Content should be visible
    expect(screen.getByText('Test content')).toBeInTheDocument();

    // Change autoExpand to false - should stay expanded (user can still collapse manually)
    rerender(
      <CollapsibleSection title="Test Section" defaultExpanded={false} autoExpand={false}>
        <div>Test content</div>
      </CollapsibleSection>
    );

    // Content should still be visible
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <CollapsibleSection title="Test Section" className="custom-class">
        <div>Test content</div>
      </CollapsibleSection>
    );

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('should show correct icon based on expanded state', () => {
    render(
      <CollapsibleSection title="Test Section" defaultExpanded={true}>
        <div>Test content</div>
      </CollapsibleSection>
    );

    // Should show down arrow when expanded
    expect(screen.getByText('▼')).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(screen.getByText('Test Section'));

    // Should show right arrow when collapsed
    expect(screen.getByText('▶')).toBeInTheDocument();
  });
});
