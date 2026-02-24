import { BoardListView } from './BoardListView';
import { BoardDetailView } from './BoardDetailView';
import type { Board } from '../types/board';

interface MainViewProps {
  selectedBoardSlug: string | null;
  boards: Board[];
  currentUser: { username: string };
  onBoardSelect: (slug: string | null) => void;
  onBoardsUpdate: () => void;
}

export function MainView({
  selectedBoardSlug,
  boards,
  currentUser,
  onBoardSelect,
  onBoardsUpdate,
}: MainViewProps) {
  return (
    <div className="main-view">
      <div className="main-view-content">
        {selectedBoardSlug ? (
          <BoardDetailView
            slug={selectedBoardSlug}
            currentUser={currentUser}
            onBack={() => onBoardSelect(null)}
          />
        ) : (
          <BoardListView
            boards={boards}
            currentUser={currentUser}
            onBoardSelect={onBoardSelect}
            onBoardsUpdate={onBoardsUpdate}
          />
        )}
      </div>
    </div>
  );
}
