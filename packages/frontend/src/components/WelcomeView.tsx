interface WelcomeViewProps {
  currentUser: { username: string };
  boardCount: number;
}

export function WelcomeView({ currentUser, boardCount }: WelcomeViewProps) {
  return (
    <div className="welcome-view">
      <div className="welcome-content">
        <div className="welcome-icon">🎵</div>
        <h1>Welcome, {currentUser.username}!</h1>
        {boardCount === 0 ? (
          <>
            <p>You don't have any boards yet.</p>
            <p>Create your first soundboard to get started.</p>
          </>
        ) : (
          <>
            <p>You have {boardCount} soundboard{boardCount !== 1 ? 's' : ''}.</p>
            <p>Select a board from the sidebar to view and manage sounds.</p>
          </>
        )}
      </div>
    </div>
  );
}
