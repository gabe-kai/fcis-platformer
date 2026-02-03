import { useState, useEffect, ReactNode } from 'react';
import './CollapsibleSection.css';

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  /** When true, automatically expands the section (e.g., when selection changes) */
  autoExpand?: boolean;
  className?: string;
}

/**
 * CollapsibleSection Component
 * 
 * A collapsible section with a header that can be clicked to expand/collapse.
 */
export function CollapsibleSection({
  title,
  children,
  defaultExpanded = true,
  autoExpand = false,
  className = '',
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  // Auto-expand when autoExpand becomes true
  useEffect(() => {
    if (autoExpand && !isExpanded) {
      setIsExpanded(true);
    }
  }, [autoExpand]);

  return (
    <div className={`collapsible-section ${className}`}>
      <button
        className="collapsible-section-header"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className="collapsible-section-title">{title}</span>
        <span className="collapsible-section-icon">
          {isExpanded ? '▼' : '▶'}
        </span>
      </button>
      {isExpanded && (
        <div className="collapsible-section-content">
          {children}
        </div>
      )}
    </div>
  );
}
