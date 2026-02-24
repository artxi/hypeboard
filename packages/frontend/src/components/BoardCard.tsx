import React from 'react';
import type { Board } from '../types/board';

interface BoardCardProps {
  board: Board;
  userRole: 'admin' | 'member';
  onClick: () => void;
}

export const BoardCard: React.FC<BoardCardProps> = ({
  board,
  userRole,
  onClick,
}) => {
  const getRelativeTime = (date: Date | string) => {
    const now = new Date();
    const then = new Date(date);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
    return `${Math.floor(seconds / 2592000)}mo ago`;
  };

  const memberCount = board.members?.length || 1;

  return (
    <div className="board-card" onClick={onClick}>
      <div className="board-card-header">
        <h3 className="board-card-name">{board.name}</h3>
        <span className={`role-badge role-badge-${userRole}`}>
          {userRole === 'admin' ? 'Admin' : 'Member'}
        </span>
      </div>
      <div className="board-card-info">
        <div className="board-card-stat">
          <span className="icon">👥</span>
          <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
        </div>
        <div className="board-card-stat">
          <span className="icon">🕐</span>
          <span>{getRelativeTime(board.lastActivity || new Date())}</span>
        </div>
      </div>
    </div>
  );
};
