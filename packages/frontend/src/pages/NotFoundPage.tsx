import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="container">
      <Card>
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>The page you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </Card>
    </div>
  );
}
