import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Icon from '../AppIcon';
import Button from './Button';
import LoginModal from '../auth/LoginModal';
import SignupModal from '../auth/SignupModal';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile, signOut, loading } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setShowUserMenu(false);
    navigate('/');
  };

  const handleSwitchToSignup = () => {
    setShowLoginModal(false);
    setShowSignupModal(true);
  };

  const handleSwitchToLogin = () => {
    setShowSignupModal(false);
    setShowLoginModal(true);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div 
              className="flex items-center space-x-3 cursor-pointer"
              onClick={() => navigate('/')}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                <Icon name="Swords" size={20} color="white" />
              </div>
              <span className="text-xl font-bold text-foreground">
                CodeDuel Arena
              </span>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <button
                onClick={() => navigate('/')}
                className={`
                  text-sm font-medium transition-colors
                  ${location.pathname === '/' ?'text-primary' :'text-muted-foreground hover:text-foreground'
                  }
                `}
              >
                Rooms
              </button>
              <button
                onClick={() => navigate('/live-coding-battle')}
                className={`
                  text-sm font-medium transition-colors
                  ${location.pathname === '/live-coding-battle' ?'text-primary' :'text-muted-foreground hover:text-foreground'
                  }
                `}
              >
                Battle
              </button>
            </nav>

            {/* User Actions */}
            <div className="flex items-center space-x-3">
              {!loading && (
                <>
                  {user ? (
                    <div className="relative">
                      <Button
                        variant="ghost"
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="flex items-center space-x-2"
                      >
                        <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                          <Icon name="User" size={16} className="text-primary" />
                        </div>
                        <span className="hidden sm:inline text-sm font-medium">
                          {userProfile?.username || user?.email?.split('@')[0]}
                        </span>
                        <Icon name="ChevronDown" size={16} />
                      </Button>

                      {showUserMenu && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg py-1">
                          <div className="px-3 py-2 border-b border-border">
                            <p className="text-sm font-medium text-foreground">
                              {userProfile?.full_name || 'User'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Rating: {userProfile?.rating || 1200}
                            </p>
                          </div>
                          <button
                            onClick={handleSignOut}
                            className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-surface flex items-center space-x-2"
                          >
                            <Icon name="LogOut" size={16} />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowLoginModal(true)}
                      >
                        Sign In
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setShowSignupModal(true)}
                      >
                        Sign Up
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Auth Modals */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSwitchToSignup={handleSwitchToSignup}
      />
      <SignupModal
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        onSwitchToLogin={handleSwitchToLogin}
      />
    </>
  );
};

export default Header;