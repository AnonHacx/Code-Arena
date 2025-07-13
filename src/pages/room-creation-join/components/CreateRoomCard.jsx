import React, { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import LoginModal from '../../../components/auth/LoginModal';
import SignupModal from '../../../components/auth/SignupModal';
import roomService from '../../../utils/roomService';
import Icon from '../../../components/AppIcon';

const CreateRoomCard = ({ onRoomCreated, isLoading }) => {
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [error, setError] = useState(null);
  const [useDemoBot, setUseDemoBot] = useState(false);

  const handleCreateRoom = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const result = await roomService.createRoom(null, useDemoBot);
      
      if (result.success) {
        onRoomCreated(result.data);
      } else {
        setError(result.error || 'Failed to create room');
      }
    } catch (err) {
      setError('Failed to create room. Please try again.');
      console.log('Room creation error:', err);
    } finally {
      setCreating(false);
    }
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
      <div className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
            <Icon name="Plus" size={24} className="text-primary" />
          </div>
          
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Create New Room
            </h3>
            <p className="text-muted-foreground text-sm">
              Start a new coding battle and invite others to join using a unique room code
            </p>
          </div>

          {error && (
            <div className="p-3 bg-error/10 border border-error/20 rounded text-sm text-error">
              {error}
            </div>
          )}

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-center space-x-4 text-xs text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Icon name="Users" size={14} />
                <span>2 players max</span>
              </div>
              <div className="flex items-center space-x-1">
                <Icon name="Clock" size={14} />
                <span>15 min time limit</span>
              </div>
            </div>

            {/* Demo Bot Toggle */}
            <div className="flex items-center justify-center space-x-3 p-3 bg-surface/50 rounded-lg border border-border">
              <Checkbox
                id="demo-bot-toggle"
                checked={useDemoBot}
                onChange={(checked) => setUseDemoBot(checked)}
                className="shrink-0"
              />
              <div className="flex-1 text-left">
                <label 
                  htmlFor="demo-bot-toggle" 
                  className="text-sm font-medium text-foreground cursor-pointer block"
                >
                  Practice with Demo Bot
                </label>
                <p className="text-xs text-muted-foreground">
                  Battle against an AI opponent for practice
                </p>
              </div>
              <Icon 
                name="Bot" 
                size={16} 
                className={`transition-colors ${useDemoBot ? 'text-primary' : 'text-muted-foreground'}`} 
              />
            </div>
            
            <Button
              onClick={handleCreateRoom}
              loading={creating}
              disabled={isLoading || creating}
              iconName="Sword"
              iconPosition="left"
              fullWidth
              className="font-medium"
            >
              {creating ? 'Creating Room...' : useDemoBot ? 'Create Practice Room' : 'Create Battle Room'}
            </Button>

            {!user && (
              <p className="text-xs text-muted-foreground">
                Sign in required to create rooms
              </p>
            )}

            {/* Room Options Info */}
            <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border">
              <div className="flex justify-between">
                <span>Room Mode:</span>
                <span className="font-medium">
                  {useDemoBot ? 'Practice (vs AI)' : 'Multiplayer (vs Human)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Difficulty:</span>
                <span className="font-medium">Random</span>
              </div>
              <div className="flex justify-between">
                <span>Language:</span>
                <span className="font-medium">Python</span>
              </div>
            </div>
          </div>
        </div>
      </div>

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

export default CreateRoomCard;