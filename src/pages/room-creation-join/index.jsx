import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/ui/Header';
import CreateRoomCard from './components/CreateRoomCard';
import JoinRoomCard from './components/JoinRoomCard';
import ConnectionStatus from './components/ConnectionStatus';
import RecentRoomsHistory from './components/RecentRoomsHistory';
import LoadingOverlay from './components/LoadingOverlay';
import roomService from '../../utils/roomService';
import Icon from '../../components/AppIcon';

const RoomCreationJoin = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingSubMessage, setLoadingSubMessage] = useState('');
  const [recentRooms, setRecentRooms] = useState([]);

  useEffect(() => {
    // Set page title
    document.title = 'Room Creation & Join - CodeDuel Arena';
    
    // Load recent rooms if user is authenticated
    if (user) {
      loadRecentRooms();
    }
  }, [user]);

  const loadRecentRooms = async () => {
    try {
      const result = await roomService.getRecentRooms(user.id);
      if (result.success) {
        setRecentRooms(result.data);
      }
    } catch (error) {
      console.log('Failed to load recent rooms:', error);
    }
  };

  const handleRoomCreated = async (roomData) => {
    setIsLoading(true);
    setLoadingMessage('Room Created Successfully!');
    setLoadingSubMessage(`Room Code: ${roomData.room_code} - Waiting for opponent to join...`);
    
    // Navigate to live battle with room data
    setTimeout(() => {
      navigate('/live-coding-battle', { 
        state: { 
          roomData // pass the full room object!
        } 
      });
    }, 2000);
  };

  const handleRoomJoined = async (roomData) => {
    setIsLoading(true);
    setLoadingMessage('Joining Room...');
    setLoadingSubMessage(`Connecting to room ${roomData.room_code}...`);
    
    // Simulate room joining process
    setTimeout(() => {
      setLoadingMessage('Connected Successfully!');
      setLoadingSubMessage('Preparing coding battle environment...');
      
      setTimeout(() => {
        navigate('/live-coding-battle', { 
          state: { 
            roomData // pass the full room object!
          } 
        });
      }, 1500);
    }, 1200);
  };

  const handleRoomSelected = async (roomCode) => {
    if (!user) {
      return; // Should not happen if component is protected
    }

    setIsLoading(true);
    setLoadingMessage('Rejoining Room...');
    setLoadingSubMessage(`Connecting to room ${roomCode}...`);

    try {
      const result = await roomService.joinRoom(roomCode);
      if (result.success) {
        handleRoomJoined(result.data);
      } else {
        setIsLoading(false);
        // Handle error - room might be full or inactive
        alert(result.error || 'Failed to rejoin room');
      }
    } catch (error) {
      setIsLoading(false);
      alert('Failed to rejoin room');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-16">
        <div className="container mx-auto px-4 py-8">
          {/* Hero Section */}
          <div className="text-center space-y-4 mb-12">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
                <Icon name="Swords" size={24} color="white" />
              </div>
              <h1 className="text-4xl font-bold text-foreground">
                Ready for Battle?
              </h1>
            </div>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Create a new coding room or join an existing battle. 
              Test your programming skills against fellow developers in real-time challenges.
            </p>
            
            <div className="flex items-center justify-center space-x-6 text-sm text-muted-foreground pt-4">
              <div className="flex items-center space-x-2">
                <Icon name="Clock" size={16} />
                <span>15 min battles</span>
              </div>
              <div className="flex items-center space-x-2">
                <Icon name="Code2" size={16} />
                <span>Python challenges</span>
              </div>
              <div className="flex items-center space-x-2">
                <Icon name="Trophy" size={16} />
                <span>Real-time results</span>
              </div>
            </div>
          </div>

          {/* Connection Status */}
          <div className="max-w-md mx-auto mb-8">
            <ConnectionStatus />
          </div>

          {/* Main Action Cards */}
          <div className="grid lg:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
            <CreateRoomCard 
              onRoomCreated={handleRoomCreated}
              isLoading={isLoading}
            />
            <JoinRoomCard 
              onRoomJoined={handleRoomJoined}
              isLoading={isLoading}
            />
          </div>

          {/* Recent Rooms History */}
          {user && (
            <div className="max-w-2xl mx-auto">
              <RecentRoomsHistory 
                rooms={recentRooms}
                onRoomSelected={handleRoomSelected}
                isLoading={isLoading}
              />
            </div>
          )}

          {/* Footer Info */}
          <div className="text-center mt-16 space-y-4">
            <div className="bg-surface border border-border rounded-lg p-6 max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold text-foreground mb-3">How It Works</h3>
              <div className="grid md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                <div className="space-y-2">
                  <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center mx-auto">
                    <Icon name="Plus" size={16} className="text-primary" />
                  </div>
                  <p>Create or join a room with unique codes</p>
                </div>
                <div className="space-y-2">
                  <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center mx-auto">
                    <Icon name="Code2" size={16} className="text-accent" />
                  </div>
                  <p>Solve coding challenges simultaneously</p>
                </div>
                <div className="space-y-2">
                  <div className="w-8 h-8 bg-success/20 rounded-lg flex items-center justify-center mx-auto">
                    <Icon name="Trophy" size={16} className="text-success" />
                  </div>
                  <p>First correct solution wins the battle</p>
                </div>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} CodeDuel Arena. Competitive coding made fun and interactive.
            </p>
          </div>
        </div>
      </main>

      {/* Loading Overlay */}
      <LoadingOverlay 
        isVisible={isLoading}
        message={loadingMessage}
        subMessage={loadingSubMessage}
      />
    </div>
  );
};

export default RoomCreationJoin;