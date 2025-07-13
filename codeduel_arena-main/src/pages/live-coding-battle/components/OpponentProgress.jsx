import React from 'react';
import Icon from '../../../components/AppIcon';

const OpponentProgress = ({ opponent, competitionStatus }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'coding': return 'text-warning';
      case 'testing': return 'text-primary';
      case 'completed': return 'text-success';
      case 'failed': return 'text-error';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'coding': return 'Code';
      case 'testing': return 'Play';
      case 'completed': return 'CheckCircle';
      case 'failed': return 'XCircle';
      default: return 'User';
    }
  };

  const getProgressPercentage = () => {
    if (opponent.status === 'completed') return 100;
    if (opponent.status === 'testing') return 85;
    if (opponent.status === 'coding') return Math.min(opponent.codeLength * 2, 80);
    return 0;
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-competitive">
      {/* Opponent Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-8 h-8 bg-gradient-to-br from-secondary to-primary rounded-full flex items-center justify-center">
              <Icon name="User" size={16} color="white" />
            </div>
            <div className={`
              absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-card
              ${opponent.isConnected ? 'bg-success' : 'bg-error'}
            `} />
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {opponent.name}
            </h3>
            <p className="text-xs text-muted-foreground">
              {opponent.isConnected ? 'Connected' : 'Disconnected'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Icon 
            name={getStatusIcon(opponent.status)} 
            size={16} 
            className={getStatusColor(opponent.status)}
          />
          <span className={`text-xs font-medium capitalize ${getStatusColor(opponent.status)}`}>
            {opponent.status}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Progress</span>
          <span className="text-xs text-foreground font-medium">
            {Math.round(getProgressPercentage())}%
          </span>
        </div>
        
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className={`
              h-2 rounded-full transition-all duration-500 ease-out
              ${opponent.status === 'completed' ? 'bg-success' :
                opponent.status === 'testing' ? 'bg-primary' :
                opponent.status === 'coding' ? 'bg-warning' : 'bg-muted-foreground'}
            `}
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <div className="text-lg font-bold text-foreground">
            {opponent.attempts}
          </div>
          <div className="text-xs text-muted-foreground">Attempts</div>
        </div>
        
        <div className="text-center">
          <div className="text-lg font-bold text-foreground">
            {opponent.testsPassed}/{opponent.totalTests}
          </div>
          <div className="text-xs text-muted-foreground">Tests</div>
        </div>
        
        <div className="text-center">
          <div className="text-lg font-bold text-foreground">
            {Math.floor(opponent.timeSpent / 60)}:{(opponent.timeSpent % 60).toString().padStart(2, '0')}
          </div>
          <div className="text-xs text-muted-foreground">Time</div>
        </div>
      </div>

      {/* Recent Activity */}
      {opponent.lastActivity && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-xs text-muted-foreground">
              {opponent.lastActivity}
            </span>
          </div>
        </div>
      )}

      {/* Victory/Defeat Banner */}
      {competitionStatus.winner && (
        <div className={`
          mt-3 p-2 rounded-lg text-center text-sm font-medium
          ${competitionStatus.winner === opponent.id 
            ? 'bg-success/20 text-success border border-success/30' :'bg-muted/20 text-muted-foreground border border-muted/30'}
        `}>
          {competitionStatus.winner === opponent.id ? (
            <div className="flex items-center justify-center space-x-2">
              <Icon name="Trophy" size={16} />
              <span>Winner!</span>
            </div>
          ) : (
            <span>Defeated</span>
          )}
        </div>
      )}
    </div>
  );
};

export default OpponentProgress;