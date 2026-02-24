import { useState } from 'react';
import { BoardResponse } from '../types/board';

interface SidebarProps {
  boards: BoardResponse[];
  selectedBoardSlug: string | null;
  onSelectBoard: (slug: string | null) => void;
  onCreateBoard: () => void;
  isOpen: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  currentUser?: { username: string };
  onManageBoard?: (slug: string) => void;
}

export function Sidebar({
  boards,
  selectedBoardSlug,
  onSelectBoard,
  onCreateBoard,
  isOpen,
  isCollapsed,
  onToggleCollapse,
  currentUser,
  onManageBoard,
}: SidebarProps) {
  const [hoveredBoard, setHoveredBoard] = useState<string | null>(null);
  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <h2 className="sidebar-title">Boards</h2>
        <button
          className="sidebar-toggle-btn"
          onClick={onToggleCollapse}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? '›' : '‹'}
        </button>
      </div>

      <ul className="sidebar-list">
        {boards.map((boardResponse) => {
          const board = boardResponse.board;
          const isAdmin = currentUser && board.admins?.includes(currentUser.username);
          // Count members separately from admins (admins shouldn't be counted twice)
          const adminSet = new Set(board.admins || []);
          const uniqueMembers = (board.members || []).filter(member => !adminSet.has(member));
          const totalMembers = (board.admins?.length || 0) + uniqueMembers.length;
          const pendingCount = board.pendingRequests?.length || 0;
          // Mock online users for now (TODO: implement real-time tracking)
          const onlineUsers = board.admins?.slice(0, Math.floor(Math.random() * (board.admins?.length || 0) + 1)) || [];
          const isActive = selectedBoardSlug === board.slug;

          return (
            <li
              key={board.slug}
              className={`sidebar-item ${isActive ? 'active' : ''} ${!isCollapsed ? 'sidebar-item-expanded' : ''}`}
              title={isCollapsed ? board.name : undefined}
            >
              <div
                className="sidebar-item-main"
                onClick={() => onSelectBoard(board.slug)}
              >
                <span className="sidebar-item-icon">{board.name.charAt(0).toUpperCase()}</span>
                <div className="sidebar-item-content">
                  <span className="sidebar-item-text">{board.name}</span>
                  {!isCollapsed && (
                    <div className="sidebar-item-meta">
                      <span className="sidebar-item-members">
                        👥 {totalMembers}
                      </span>
                      <span className="sidebar-item-separator">•</span>
                      <span
                        className="sidebar-item-online"
                        onMouseEnter={() => setHoveredBoard(board.slug)}
                        onMouseLeave={() => setHoveredBoard(null)}
                      >
                        🟢 {onlineUsers.length}
                        {hoveredBoard === board.slug && onlineUsers.length > 0 && (
                          <div className="online-users-tooltip">
                            <div className="online-users-title">Online now:</div>
                            {onlineUsers.map((user) => (
                              <div key={user} className="online-user-item">{user}</div>
                            ))}
                          </div>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {!isCollapsed && isAdmin && onManageBoard && (
                <button
                  className="sidebar-manage-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onManageBoard(board.slug);
                  }}
                  title="Manage board"
                >
                  ⚙️
                  {pendingCount > 0 && (
                    <span className="sidebar-manage-badge">{pendingCount}</span>
                  )}
                </button>
              )}
            </li>
          );
        })}

        {/* New Board Button */}
        <li className="sidebar-new-board-separator"></li>
        <li className="sidebar-new-board-item">
          <button className="sidebar-new-board-btn" onClick={onCreateBoard}>
            <span className="sidebar-new-board-icon">+</span>
            <span className="sidebar-new-board-text">New Board</span>
          </button>
        </li>
      </ul>

      <div className="sidebar-footer"></div>
    </aside>
  );
}
