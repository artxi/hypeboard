import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UserProvider } from './contexts/UserContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MainView } from './components/MainView';
import { LoginModal } from './components/LoginModal';
import { InvitePage } from './pages/InvitePage';
import { api } from './services/api';
import type { Board, BoardResponse } from './types/board';

function MainApp() {
  const { user, loading: authLoading, logout } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardSlug, setSelectedBoardSlug] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingBoards, setLoadingBoards] = useState(false);

  // Fetch boards when user is authenticated
  useEffect(() => {
    if (user) {
      fetchBoards();
    }
  }, [user]);

  const fetchBoards = async () => {
    if (!user) return;

    try {
      setLoadingBoards(true);
      const data = await api.getUserBoards(user.username);
      setBoards(data);
    } catch (err: any) {
      console.error('Failed to fetch boards:', err);
    } finally {
      setLoadingBoards(false);
    }
  };

  const handleLogout = () => {
    logout();
    setBoards([]);
    setSelectedBoardSlug(null);
  };

  const handleLogoClick = () => {
    setSelectedBoardSlug(null);
  };

  const handleSelectBoard = (slug: string | null) => {
    setSelectedBoardSlug(slug);
    // Close sidebar on mobile when board is selected
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const getSelectedBoardName = () => {
    if (!selectedBoardSlug) return null;
    const board = boards.find((b) => b.slug === selectedBoardSlug);
    return board?.name || null;
  };

  // Show loading screen during auth initialization
  if (authLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Show login modal if not authenticated
  if (!user) {
    return <LoginModal isOpen={true} />;
  }

  // Convert boards to BoardResponse format for Sidebar
  const boardResponses: BoardResponse[] = boards.map((board) => ({
    board,
    userRole: board.admins?.includes(user.username) ? 'admin' : 'member',
  }));

  return (
    <div className="app-container">
      <Header
        currentUser={user}
        selectedBoardName={getSelectedBoardName()}
        onLogout={handleLogout}
        onLogoClick={handleLogoClick}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />
      <div className="app-body">
        <Sidebar
          boards={boardResponses}
          selectedBoardSlug={selectedBoardSlug}
          onSelectBoard={handleSelectBoard}
          onCreateBoard={() => {
            // Create board is handled in BoardListView
            // Just deselect current board to show the list
            setSelectedBoardSlug(null);
          }}
          isOpen={sidebarOpen}
        />
        <MainView
          selectedBoardSlug={selectedBoardSlug}
          boards={boards}
          currentUser={user}
          onBoardSelect={handleSelectBoard}
          onBoardsUpdate={fetchBoards}
        />
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <UserProvider>
        <ThemeProvider>
          <BrowserRouter>
            <Routes>
              {/* Keep invite page as a separate route since it needs to be publicly accessible */}
              <Route path="/invite/:code" element={<InvitePage />} />
              {/* All other routes use the single-page app */}
              <Route path="*" element={<MainApp />} />
            </Routes>
          </BrowserRouter>
        </ThemeProvider>
      </UserProvider>
    </AuthProvider>
  );
}

export default App;
