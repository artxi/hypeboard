import { BoardResponse } from '../types/board';

interface SidebarProps {
  boards: BoardResponse[];
  selectedBoardSlug: string | null;
  onSelectBoard: (slug: string | null) => void;
  onCreateBoard: () => void;
  isOpen: boolean;
}

export function Sidebar({
  boards,
  selectedBoardSlug,
  onSelectBoard,
  onCreateBoard,
  isOpen,
}: SidebarProps) {
  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <h2 className="sidebar-title">Boards</h2>
      </div>

      <ul className="sidebar-list">
        <li
          className={`sidebar-item ${selectedBoardSlug === null ? 'active' : ''}`}
          onClick={() => onSelectBoard(null)}
        >
          📋 All Boards
        </li>

        {boards.map((boardResponse) => (
          <li
            key={boardResponse.board.slug}
            className={`sidebar-item ${
              selectedBoardSlug === boardResponse.board.slug ? 'active' : ''
            }`}
            onClick={() => onSelectBoard(boardResponse.board.slug)}
            title={boardResponse.board.name}
          >
            {boardResponse.board.name}
          </li>
        ))}
      </ul>

      <div className="sidebar-footer">
        <button className="btn btn-primary btn-full-width" onClick={onCreateBoard}>
          + New Board
        </button>
      </div>
    </aside>
  );
}
