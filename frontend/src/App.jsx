import React, { useState, useEffect } from 'react';
import { setOnLogout, getAccessToken, clearTokens, categoriesAPI } from './api';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import TaskManager from './components/TaskManager';
import Categories from './components/Categories';
import AIChatCoach from './components/AIChatCoach';
import {
  LayoutDashboard,
  ListTodo,
  Tag,
  Sparkles,
  LogOut,
  Sun,
  Moon,
  CheckSquare,
  X,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState('login'); // 'login' | 'register'
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'tasks' | 'categories' | 'coach'
  const [categories, setCategories] = useState([]);
  const [theme, setTheme] = useState('dark');
  const [toasts, setToasts] = useState([]);

  // Toast notification manager
  const addToast = (title, message, type = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, title, message, type }]);
    
    // Auto-dismiss in 5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Fetch categories
  const loadCategories = async () => {
    try {
      const data = await categoriesAPI.getCategories();
      setCategories(data.categories || []);
    } catch (err) {
      console.warn("Could not load categories initially:", err);
    }
  };

  // Auth Success handler
  const handleAuthSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    addToast('Welcome back!', `Logged in successfully as ${userData.name || userData.email}`, 'success');
    setCurrentView('dashboard');
    loadCategories();
  };

  const handleLogout = () => {
    setUser(null);
    clearTokens();
    localStorage.removeItem('user');
    setAuthView('login');
    addToast('Goodbye', 'You have been logged out of the session.', 'info');
  };

  // Initialize session and theme
  useEffect(() => {
    // Set global logout handler for API 401 interceptor
    setOnLogout(() => {
      setUser(null);
      localStorage.removeItem('user');
      setAuthView('login');
    });

    // Check localStorage session
    const token = getAccessToken();
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        loadCategories();
      } catch (err) {
        clearTokens();
        localStorage.removeItem('user');
      }
    }

    // Load theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  // Sync theme changes
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    addToast('Theme Swapped', `Switched to ${nextTheme} mode.`, 'success');
  };

  // Route Views
  const renderActiveView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            onNavigateToTasks={() => setCurrentView('tasks')}
            onNavigateToCoach={() => setCurrentView('coach')}
            addToast={addToast}
          />
        );
      case 'tasks':
        return (
          <TaskManager
            categories={categories}
            reloadCategories={loadCategories}
            addToast={addToast}
          />
        );
      case 'categories':
        return (
          <Categories
            categories={categories}
            reloadCategories={loadCategories}
            addToast={addToast}
          />
        );
      case 'coach':
        return <AIChatCoach addToast={addToast} />;
      default:
        return <div>View not found.</div>;
    }
  };

  // Trigger startup reminder simulation
  useEffect(() => {
    if (user && currentView === 'dashboard') {
      // Simulate checking overdue/due tasks for a startup reminder on dashboard view load
      const timer = setTimeout(() => {
        addToast('Startup Reminder Scan', 'Dashboard loaded. Scanning your pending items and categories...', 'info');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, currentView]);

  if (!user) {
    if (authView === 'register') {
      return <Register onNavigateToLogin={() => setAuthView('login')} />;
    }
    return <Login onAuthSuccess={handleAuthSuccess} onNavigateToRegister={() => setAuthView('register')} />;
  }

  return (
    <div className="app-container">
      
      {/* Sidebar navigation */}
      <aside className="sidebar">
        
        {/* Brand header */}
        <div className="sidebar-header">
          <CheckSquare size={24} color="var(--primary)" />
          <span style={{ fontWeight: 800, letterSpacing: '0.5px' }}>SmartTask</span>
        </div>

        {/* Menu items */}
        <ul className="sidebar-menu">
          <li>
            <div
              className={`sidebar-link ${currentView === 'dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentView('dashboard')}
            >
              <LayoutDashboard size={18} />
              Dashboard
            </div>
          </li>
          <li>
            <div
              className={`sidebar-link ${currentView === 'tasks' ? 'active' : ''}`}
              onClick={() => setCurrentView('tasks')}
            >
              <ListTodo size={18} />
              Tasks Workspace
            </div>
          </li>
          <li>
            <div
              className={`sidebar-link ${currentView === 'categories' ? 'active' : ''}`}
              onClick={() => setCurrentView('categories')}
            >
              <Tag size={18} />
              Categories
            </div>
          </li>
          <li>
            <div
              className={`sidebar-link ${currentView === 'coach' ? 'active' : ''}`}
              onClick={() => setCurrentView('coach')}
            >
              <Sparkles size={18} />
              AI Coach
            </div>
          </li>
        </ul>

        {/* Sidebar Footer (Theme toggle, User Info, Sign Out) */}
        <div style={{
          borderTop: '1px solid var(--border-color)',
          paddingTop: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          {/* Theme switcher */}
          <button
            onClick={toggleTheme}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              fontSize: '15px',
              width: '100%',
              textAlign: 'left'
            }}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>

          {/* User profile card */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '4px 16px'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '14px',
              textTransform: 'uppercase'
            }}>
              {(user.name || user.email)[0]}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.name || 'User'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                Role: {user.role?.toLowerCase()}
              </div>
            </div>
          </div>

          {/* Sign out */}
          <button
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--danger)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              fontSize: '15px',
              fontWeight: 600,
              width: '100%',
              textAlign: 'left'
            }}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>

      </aside>

      {/* Main content body */}
      <main className="main-content">
        <div className="content-body">
          {renderActiveView()}
        </div>
      </main>

      {/* Toast Notification stack overlay */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '360px',
        width: '100%'
      }}>
        {toasts.map(t => (
          <div
            key={t.id}
            style={{
              background: 'var(--bg-secondary)',
              borderLeft: `5px solid ${
                t.type === 'success' ? 'var(--accent)' :
                t.type === 'warning' ? 'var(--danger)' : 'var(--primary)'
              }`,
              borderTop: '1px solid var(--border-color)',
              borderRight: '1px solid var(--border-color)',
              borderBottom: '1px solid var(--border-color)',
              padding: '14px 18px',
              borderRadius: '10px',
              boxShadow: 'var(--shadow)',
              backdropFilter: 'blur(8px)',
              position: 'relative',
              display: 'flex',
              gap: '10px',
              alignItems: 'start',
              animation: 'slideIn 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <div style={{
              color: t.type === 'success' ? 'var(--accent)' :
                     t.type === 'warning' ? 'var(--danger)' : 'var(--primary)',
              marginTop: '2px'
            }}>
              {t.type === 'success' ? <CheckCircle size={16} /> :
               t.type === 'warning' ? <AlertCircle size={16} /> : <Info size={16} />}
            </div>

            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                {t.title}
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                {t.message}
              </p>
            </div>

            <button
              onClick={() => removeToast(t.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '2px',
                marginTop: '1px'
              }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideIn {
          0% { transform: translateX(50px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
      `}</style>

    </div>
  );
}
