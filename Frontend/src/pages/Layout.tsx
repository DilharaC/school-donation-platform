// Layout.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
// import '../css/App.css';



interface LayoutProps {
  currentUser: any;
  setCurrentUser: (user: any) => void;
}

const Layout: React.FC<LayoutProps> = ({ currentUser, setCurrentUser }) => {
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();

  // Logout function
  const handleLogout = async () => {
    try {
      await axios.get('http://localhost:8000/sanctum/csrf-cookie', { withCredentials: true });
      await axios.post('http://localhost:8000/api/logout', {}, { withCredentials: true });

      setCurrentUser(null);
      localStorage.removeItem('currentUser');
      setDropdownVisible(false);
      navigate('/');
      alert('Logged out successfully');
    } catch (err: any) {
      console.error('Logout failed:', err);
      alert('Logout failed. Please try again.');
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownVisible(false);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Header hide/show on scroll
  useEffect(() => {
    let lastScrollTop = 0;

    const handleScroll = () => {
      if (!headerRef.current) return;

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

      if (scrollTop === 0) {
        headerRef.current.classList.remove('hide');
        headerRef.current.classList.remove('show-shadow');
      } else if (scrollTop > lastScrollTop) {
        headerRef.current.classList.add('hide');
        headerRef.current.classList.remove('show-shadow');
      } else {
        headerRef.current.classList.remove('hide');
        headerRef.current.classList.add('show-shadow');
      }

      lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="App">
      {/* Header */}
      <header ref={headerRef} className="header">
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="logo">
            <h2>SchoolDonate</h2>
          </div>

          <div className="nav-links" style={{ display: 'flex', gap: '20px' }}>
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
            <Link to="/projects">Projects</Link>
            <Link to="/blog">Blog</Link>
            <Link to="/contact">Contact</Link>
          </div>

          <div className="nav-cta" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {currentUser ? (
              <div ref={dropdownRef} style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
                {/* Notification icon */}
               <button
  style={{
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '24px',
    color: '#1f2937',
    position: 'relative',
    borderRadius: '50%',
    padding: '6px', // space for hover circle
    transition: 'background-color 0.2s',
  }}
  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#d4d4d469')}
  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
  onClick={() => alert('Notifications clicked!')}
>
  <i className="bx bx-bell"></i>
  <span
    style={{
      position: 'absolute',
      top: '-4px',
      right: '-4px',
      backgroundColor: 'red',
      color: 'white',
      fontSize: '10px',
      fontWeight: 'bold',
      borderRadius: '50%',
      width: '16px',
      height: '16px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}
  >
    3
  </span>
</button>

{/* Profile icon */}
<button
  style={{
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '28px',
    color: '#444',
    borderRadius: '50%',
    padding: '6px', // space for hover circle
    transition: 'background-color 0.2s',
  }}
  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#d4d4d469')}
  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
  onClick={() => setDropdownVisible(!dropdownVisible)}
>
  <i className="bx bx-user"></i>
</button>

                {/* Dropdown */}
                {dropdownVisible && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '110%',
                      right: 0,
                      width: '220px',
                      backgroundColor: '#fff',
                      borderRadius: '6px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      zIndex: 50,
                    }}
                  >
                    <div style={{ padding: '10px', borderBottom: '1px solid #e5e7eb' }}>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>{currentUser.name}</p>
                      {currentUser.email && (
                        <p
                          style={{
                            margin: '4px 0 0 0',
                            fontSize: '12px',
                            color: '#6b7280',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {currentUser.email}
                        </p>
                      )}
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      <li>
                        <Link
                          to={currentUser.userType === 'donor' ? '/donor-dashboard' : '/school-dashboard'}
                          style={{ display: 'block', padding: '8px 10px', textDecoration: 'none', color: '#1f2937' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          Dashboard
                        </Link>
                      </li>
                      <li>
                        <button
                          onClick={handleLogout}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            textAlign: 'left',
                            border: 'none',
                            backgroundColor: 'transparent',
                            cursor: 'pointer',
                            color: '#1f2937',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          Logout
                        </button>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="btn-secondary"
                style={{
                  padding: '10px 20px',
                  borderRadius: '5px',
                  fontSize: '15px',
                  fontWeight: 'bold',
                }}
              >
                Login
              </Link>
            )}

            {/* CTA Button: Support a School */}
            <Link
              to="/support-school"
              className="btn-primary"
              style={{
                padding: '10px 20px',
                borderRadius: '5px',
                fontSize: '15px',
                fontWeight: 'bold',
                backgroundColor: '#e63946',
                color: '#fff',
                textDecoration: 'none',
              }}
            >
              Support a School
            </Link>
          </div>
        </nav>
      </header>

      {/* Page Content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '15px', background: '#f9fafb', marginTop: '20px' }}>
        <p>&copy; 2025 SchoolDonate. All Rights Reserved.</p>
      </footer>
    </div>
  );
};

export default Layout;
