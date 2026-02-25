import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  currentUser: { username: string } | null;
  selectedBoardName: string | null;
  onLogout: () => void;
  onLogoClick: () => void;
  onToggleSidebar: () => void;
  // Optional board control props (only present when viewing a board)
  editMode?: boolean;
  cardSize?: 'small' | 'medium' | 'large';
  onEditModeToggle?: () => void;
  onCardSizeChange?: (size: 'small' | 'medium' | 'large') => void;
}

export function Header({
  currentUser,
  selectedBoardName,
  onLogout,
  onLogoClick,
  onToggleSidebar,
  editMode,
  cardSize,
  onEditModeToggle,
  onCardSizeChange,
}: HeaderProps) {
  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <button className="sidebar-toggle" onClick={onToggleSidebar}>
            ☰
          </button>
          <h1 className="header-logo" onClick={onLogoClick}>
            HypeBoard
          </h1>
          {selectedBoardName && (
            <span className="header-board-name">{selectedBoardName}</span>
          )}
        </div>

        <div className="header-right">
          {/* Board controls - only show when viewing a board */}
          {onCardSizeChange && cardSize && (
            <div className="card-size-switch">
              <button
                onClick={() => onCardSizeChange('small')}
                className={`card-size-option ${cardSize === 'small' ? 'active' : ''}`}
                title="Small cards"
              >
                S
              </button>
              <button
                onClick={() => onCardSizeChange('medium')}
                className={`card-size-option ${cardSize === 'medium' ? 'active' : ''}`}
                title="Medium cards"
              >
                M
              </button>
              <button
                onClick={() => onCardSizeChange('large')}
                className={`card-size-option ${cardSize === 'large' ? 'active' : ''}`}
                title="Large cards"
              >
                L
              </button>
            </div>
          )}

          {onEditModeToggle !== undefined && editMode !== undefined && (
            <button
              onClick={onEditModeToggle}
              className={`header-edit-button ${editMode ? 'active' : ''}`}
              title={editMode ? 'Exit edit mode' : 'Enter edit mode'}
            >
              {editMode ? '✓ Done' : 'Edit cards'}
            </button>
          )}

          {currentUser && (
            <>
              <div className="header-separator" />
              <span className="user-badge">@{currentUser.username}</span>
              <button className="header-btn" onClick={onLogout}>
                Logout
              </button>
              <div className="header-separator" />
            </>
          )}

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
