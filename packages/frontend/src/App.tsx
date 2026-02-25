import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UserProvider } from './contexts/UserContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SocketProvider } from './contexts/SocketContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MainView } from './components/MainView';
import { LoginModal } from './components/LoginModal';
import { CreateBoardModal } from './components/CreateBoardModal';
import { InvitePage } from './pages/InvitePage';
import { api } from './services/api';
import type { Board, BoardResponse } from './types/board';

function MainApp() {
  const { user, loading: authLoading, logout } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardSlug, setSelectedBoardSlug] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [showCreateBoardModal, setShowCreateBoardModal] = useState(false);

  // Fetch boards when user is authenticated
  useEffect(() => {
    if (user) {
      fetchBoards();
    }
  }, [user]);

  // Persist sidebar collapsed state
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const fetchBoards = async () => {
    if (!user) return;

    try {
      const data = await api.getUserBoards(user.username);
      setBoards(data);

      // Auto-select first board if user has boards and none is selected
      if (data.length > 0 && !selectedBoardSlug) {
        setSelectedBoardSlug(data[0].slug);
      }
    } catch (err: any) {
      console.error('Failed to fetch boards:', err);
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

  const handleManageBoard = (slug: string) => {
    // Ensure the board is selected
    if (selectedBoardSlug !== slug) {
      setSelectedBoardSlug(slug);
    }
    // Trigger the admin panel to open via window global
    setTimeout(() => {
      (window as any).__openAdminPanel?.();
    }, 100);
  };

  const handleCreateBoard = () => {
    setShowCreateBoardModal(true);
  };

  const handleBoardCreated = (slug: string) => {
    fetchBoards();
    setSelectedBoardSlug(slug);
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
          onCreateBoard={handleCreateBoard}
          isOpen={sidebarOpen}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          currentUser={user}
          onManageBoard={handleManageBoard}
        />
        <CreateBoardModal
          isOpen={showCreateBoardModal}
          onClose={() => setShowCreateBoardModal(false)}
          currentUser={user}
          onBoardCreated={handleBoardCreated}
        />
        <MainView
          selectedBoardSlug={selectedBoardSlug}
          boards={boards}
          currentUser={user}
          onBoardSelect={handleSelectBoard}
          onManageBoard={() => {}}
        />
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
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
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
