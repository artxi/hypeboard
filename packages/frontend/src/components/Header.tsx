import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  currentUser: { username: string } | null;
  selectedBoardName: string | null;
  onLogout: () => void;
  onLogoClick: () => void;
  onToggleSidebar: () => void;
}

export function Header({
  currentUser,
  selectedBoardName,
  onLogout,
  onLogoClick,
  onToggleSidebar,
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
          <ThemeToggle />
          {currentUser && (
            <>
              <span className="user-badge">@{currentUser.username}</span>
              <button className="header-btn" onClick={onLogout}>
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
