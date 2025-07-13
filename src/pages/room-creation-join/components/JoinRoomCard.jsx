import React, { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import LoginModal from '../../../components/auth/LoginModal';
import SignupModal from '../../../components/auth/SignupModal';
import roomService from '../../../utils/roomService';
import Icon from '../../../components/AppIcon';

const JoinRoomCard = ({ onRoomJoined, isLoading }) => {
  const { user } = useAuth();
  const [roomCode, setRoomCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [error, setError] = useState(null);

  const handleJoinRoom = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    setJoining(true);
    setError(null);

    try {
      const result = await roomService.joinRoom(roomCode.trim());
      
      if (result.success) {
        onRoomJoined(result.data);
      } else if (result.error === 'You are already in this room') {
        // Fetch room details by code and proceed
        const roomDetails = await roomService.getRoomDetailsByCode(roomCode.trim());
        if (roomDetails.success) {
          onRoomJoined(roomDetails.data);
        } else {
          setError(roomDetails.error || 'Failed to load room details');
        }
      } else {
        setError(result.error || 'Failed to join room');
      }
    } catch (err) {
      setError('Failed to join room. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  const handleRoomCodeChange = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length <= 6) {
      setRoomCode(value);
      setError(null);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && roomCode.trim() && !joining) {
      handleJoinRoom();
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
          <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mx-auto">
            <Icon name="LogIn" size={24} className="text-secondary" />
          </div>
          
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Join Existing Room
            </h3>
            <p className="text-muted-foreground text-sm">
              Enter a room code to join an ongoing or scheduled coding battle
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Room Code
              </label>
              <Input
                type="text"
                value={roomCode}
                onChange={handleRoomCodeChange}
                onKeyPress={handleKeyPress}
                placeholder="Enter 6-digit code"
                className="text-center text-lg font-mono tracking-wider"
                disabled={joining || isLoading}
                maxLength={6}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Room codes are case-insensitive and contain letters and numbers
              </p>
            </div>

            {error && (
              <div className="p-3 bg-error/10 border border-error/20 rounded text-sm text-error">
                {error}
              </div>
            )}
            
            <Button
              onClick={handleJoinRoom}
              loading={joining}
              disabled={!roomCode.trim() || isLoading || joining}
              iconName="ArrowRight"
              iconPosition="right"
              fullWidth
              className="font-medium"
            >
              {joining ? 'Joining...' : 'Join Battle'}
            </Button>

            {!user && (
              <p className="text-xs text-muted-foreground">
                Sign in required to join rooms
              </p>
            )}
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

export default JoinRoomCard;