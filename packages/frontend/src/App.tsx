import { useEffect, useState } from 'react';

interface HealthResponse {
  status: string;
  timestamp: number;
  uptime: number;
}

interface HelloResponse {
  message: string;
  version: string;
}

function App() {
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [helloData, setHelloData] = useState<HelloResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch both endpoints
        const [healthRes, helloRes] = await Promise.all([
          fetch(`${API_URL}/health`),
          fetch(`${API_URL}/`),
        ]);

        if (!healthRes.ok || !helloRes.ok) {
          throw new Error('Failed to fetch from backend');
        }

        const healthJson = await healthRes.json();
        const helloJson = await helloRes.json();

        setHealthData(healthJson);
        setHelloData(helloJson);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [API_URL]);

  return (
    <div className="app">
      <div className="container">
        <h1>🎉 Hello World - HypeBoard</h1>

        <div className="info">
          <p className="subtitle">Frontend successfully deployed!</p>
          <p className="api-info">API URL: <code>{API_URL}</code></p>
        </div>

        {loading && (
          <div className="status loading">
            <p>⏳ Loading data from backend...</p>
          </div>
        )}

        {error && (
          <div className="status error">
            <p>❌ Error: {error}</p>
            <p className="hint">
              Make sure the backend is running at {API_URL}
            </p>
          </div>
        )}

        {!loading && !error && healthData && helloData && (
          <div className="status success">
            <h2>✅ Backend Connection Successful!</h2>

            <div className="data-section">
              <h3>Root Endpoint Response:</h3>
              <div className="data-box">
                <p><strong>Message:</strong> {helloData.message}</p>
                <p><strong>Version:</strong> {helloData.version}</p>
              </div>
            </div>

            <div className="data-section">
              <h3>Health Endpoint Response:</h3>
              <div className="data-box">
                <p><strong>Status:</strong> {healthData.status}</p>
                <p><strong>Timestamp:</strong> {new Date(healthData.timestamp).toLocaleString()}</p>
                <p><strong>Uptime:</strong> {Math.floor(healthData.uptime)}s</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
