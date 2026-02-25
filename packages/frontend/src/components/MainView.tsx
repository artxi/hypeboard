import { useRef } from 'react';
import { WelcomeView } from './WelcomeView';
import { BoardDetailView, BoardDetailViewHandle } from './BoardDetailView';
import type { Board } from '../types/board';

interface MainViewProps {
  selectedBoardSlug: string | null;
  boards: Board[];
  currentUser: { username: string };
  onBoardSelect: (slug: string | null) => void;
  onManageBoard?: () => void;
  editMode: boolean;
  cardSize: 'small' | 'medium' | 'large';
}

export function MainView({
  selectedBoardSlug,
  boards,
  currentUser,
  onBoardSelect,
  onManageBoard,
  editMode,
  cardSize,
}: MainViewProps) {
  const boardDetailRef = useRef<BoardDetailViewHandle>(null);

  // Expose method to open admin panel
  if (onManageBoard) {
    (window as any).__openAdminPanel = () => {
      boardDetailRef.current?.openAdminPanel();
    };
  }

  return (
    <div className="main-view">
      <div className="main-view-content">
        {selectedBoardSlug ? (
          <BoardDetailView
            ref={boardDetailRef}
            slug={selectedBoardSlug}
            currentUser={currentUser}
            onBack={() => onBoardSelect(null)}
            editMode={editMode}
            cardSize={cardSize}
          />
        ) : (
          <WelcomeView currentUser={currentUser} boardCount={boards.length} />
        )}
      </div>
    </div>
  );
}
