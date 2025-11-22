// Layout.tsx
import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../css/App.css';

interface LayoutProps {
  currentUser: any;
  setCurrentUser: (user: any) => void;
}

const Layout: React.FC<LayoutProps> = ({ currentUser, setCurrentUser }) => {
  const [headerHidden, setHeaderHidden] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const navigate = useNavigate();

  // Scroll effect for header
  useEffect(() => {
    const handleScroll = () => {
      setHeaderHidden(scrollY < window.scrollY && window.scrollY > 100);
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrollY]);

  // Logout function
  const handleLogout = async () => {
    try {
      // 1. Get CSRF cookie
      await axios.get('http://localhost:8000/sanctum/csrf-cookie', { withCredentials: true });

      // 2. Call logout
      await axios.post('http://localhost:8000/api/logout', {}, { withCredentials: true });

      // 3. Clear local user state
      setCurrentUser(null);
      localStorage.removeItem('currentUser');

      // 4. Redirect to home
      navigate('/');
      alert('Logged out successfully');
    } catch (err: any) {
      console.error('Logout failed:', err);
      alert('Logout failed. Please try again.');
    }
  };

  return (
    <div className="App">
      {/* Header */}
      <header className={`header ${headerHidden ? 'hide' : ''} ${scrollY > 50 ? 'show-shadow' : ''}`}>
        <nav>
          <div className="logo"><h2>SchoolDonate</h2></div>

          <div className="nav-links">
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
            <Link to="/projects">Projects</Link>
            <Link to="/blog">Blog</Link>
            <Link to="/contact">Contact</Link>
          </div>

          <div className="nav-cta">
            <a href="#donate" className="btn-primary">Donate Now</a>

            {currentUser ? (
              <span className="btn-secondary" onClick={() => setSidebarVisible(true)}>
                <i className="fa-regular fa-user"></i> {currentUser.name}
              </span>
            ) : (
              <Link to="/login" className="btn-secondary">Login</Link>
            )}
          </div>
        </nav>
      </header>

      {/* Sidebar */}
      <div className={`sidebar ${sidebarVisible ? 'show' : ''}`}>
        <div>
          <div className="sidebar-header">
            <h3>Account Details</h3>
            <span id="closeSidebar" onClick={() => setSidebarVisible(false)}>&times;</span>
          </div>

          <div className="sidebar-content">
            {currentUser ? (
              <>
                {currentUser.userType === 'donor' ? (
                  <>
                    <p><strong>Full Name:</strong> {currentUser.name}</p>
                    <p><strong>Email:</strong> {currentUser.email}</p>
                    <p><strong>Phone:</strong> {currentUser.phone || 'Not provided'}</p>
                    <p><strong>Address:</strong> {currentUser.address || 'Not provided'}</p>
                    <Link to="/donor-dashboard" className="dashboard-btn">Dashboard</Link>
                  </>
                ) : (
                  <>
                    <p><strong>School Name:</strong> {currentUser.name}</p>
                    {currentUser.logoUrl && (
                      <p>
                        <strong>Logo:</strong><br />
                        <img src={currentUser.logoUrl} alt="School Logo" />
                      </p>
                    )}
                    <Link to="/school-dashboard" className="dashboard-btn">Dashboard</Link>
                  </>
                )}
              </>
            ) : (
              <div className="not-logged">
                You are not logged in. Please login to access your account.
                <Link to="/login">Go to Login</Link>
              </div>
            )}
          </div>
        </div>

        {currentUser && (
          <div className="sidebar-bottom">
            <span className="logout-btn" onClick={handleLogout}>Logout</span>
          </div>
        )}
      </div>

      {/* Page Content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer>
        <div className="section-content text-center">
          <p>&copy; 2025 SchoolDonate. All Rights Reserved.</p>
          <p>
            <a href="#">Facebook</a> |
            <a href="#">Twitter</a> |
            <a href="#">Instagram</a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
