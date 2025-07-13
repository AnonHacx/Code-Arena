import React from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

const RecentRoomsHistory = ({ rooms = [], onRoomSelected, isLoading }) => {
  const { user } = useAuth();

  if (!user || !rooms?.length) {
    return null;
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <Icon name="CheckCircle" size={16} className="text-success" />;
      case 'active':
        return <Icon name="Clock" size={16} className="text-warning" />;
      case 'cancelled':
        return <Icon name="XCircle" size={16} className="text-error" />;
      default:
        return <Icon name="Clock" size={16} className="text-muted-foreground" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'active':
        return 'In Progress';
      case 'cancelled':
        return 'Cancelled';
      case 'waiting':
        return 'Waiting';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Recent Battles</h3>
        <Icon name="History" size={20} className="text-muted-foreground" />
      </div>

      <div className="space-y-3">
        {rooms.map((room) => (
          <div
            key={room.id}
            className="flex items-center justify-between p-3 bg-surface border border-border rounded-lg hover:bg-surface/80 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(room.status)}
                  <span className="font-mono text-sm font-medium text-foreground">
                    {room.room_code}
                  </span>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  {formatDate(room.created_at)}
                </div>
              </div>
              
              <div className="mt-1 flex items-center space-x-4 text-xs text-muted-foreground">
                <span>{getStatusText(room.status)}</span>
                {room.challenge?.title && (
                  <span className="truncate">
                    {room.challenge.title}
                  </span>
                )}
                {room.challenge?.difficulty && (
                  <span className={`
                    px-1.5 py-0.5 rounded text-xs font-medium
                    ${room.challenge.difficulty === 'easy' ? 'bg-success/20 text-success' :
                      room.challenge.difficulty === 'medium'? 'bg-warning/20 text-warning' : 'bg-error/20 text-error'}
                  `}>
                    {room.challenge.difficulty}
                  </span>
                )}
                {room.winner?.username && (
                  <span className="text-success">
                    Winner: {room.winner.username}
                  </span>
                )}
              </div>
            </div>

            {room.status === 'waiting' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRoomSelected(room.room_code)}
                disabled={isLoading}
                iconName="ArrowRight"
                iconPosition="right"
              >
                Rejoin
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 text-center">
        <p className="text-xs text-muted-foreground">
          Showing your {rooms.length} most recent battle{rooms.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
};

export default RecentRoomsHistory;