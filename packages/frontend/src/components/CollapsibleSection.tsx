import { useState, ReactNode } from 'react';

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: number;
}

export function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
  badge
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="collapsible-section">
      <button
        className="collapsible-header"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <div className="collapsible-title">
          <span>{title}</span>
          {badge !== undefined && badge > 0 && (
            <span className="badge">{badge}</span>
          )}
        </div>
        <span className="collapsible-icon">{isOpen ? '▼' : '▶'}</span>
      </button>
      {isOpen && (
        <div className="collapsible-content">
          {children}
        </div>
      )}
    </div>
  );
}
