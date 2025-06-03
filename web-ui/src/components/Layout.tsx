import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div>
      <nav className="nav">
        <div className="container nav-container">
          <div className="flex justify-between">
            <div className="flex">
              <div className="flex items-center">
                <Link to="/" className="nav-brand">
                  Socratic Learning
                </Link>
              </div>
              <div className="nav-links">
                <Link
                  to="/"
                  className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
                >
                  Home
                </Link>
                <Link
                  to="/metrics"
                  className={`nav-link ${location.pathname === '/metrics' ? 'active' : ''}`}
                >
                  Metrics
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="mt-4">
        {children}
      </main>
    </div>
  );
} 