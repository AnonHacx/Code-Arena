import React from 'react';
import Icon from '../../../components/AppIcon';

const CompetitionStatus = ({ 
  competitionStatus, 
  userStats, 
  onRestartRequest,
  currentUserId 
}) => {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (competitionStatus.timeRemaining < 60) return 'text-error';
    if (competitionStatus.timeRemaining < 300) return 'text-warning';
    return 'text-foreground';
  };

  if (competitionStatus.winner) {
    const isWinner = competitionStatus.winner === 'user' || competitionStatus.winner === currentUserId;
    console.log('CompetitionStatus - winner:', competitionStatus.winner, 'currentUserId:', currentUserId, 'isWinner:', isWinner);
    
    return (
      <div className={`
        bg-card border rounded-lg p-6 text-center shadow-elevated
        ${isWinner ? 'border-success bg-success/5' : 'border-muted bg-muted/5'}
      `}>
        <div className="mb-4">
          <Icon 
            name={isWinner ? "Trophy" : "Target"} 
            size={48} 
            className={isWinner ? "text-success" : "text-muted-foreground"}
          />
        </div>
        
        <h2 className={`
          text-2xl font-bold mb-2
          ${isWinner ? 'text-success' : 'text-muted-foreground'}
        `}>
          {isWinner ? 'You Won!' : 'Better Luck Next Time!'}
        </h2>
        
        <p className="text-muted-foreground mb-4">
          {isWinner 
            ? 'Congratulations! You solved the challenge first.' :'Your opponent completed the challenge first.'}
        </p>

        {/* Final Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-surface rounded-lg p-3 border border-border">
            <div className="text-lg font-bold text-foreground">
              {formatTime(competitionStatus.finalTime)}
            </div>
            <div className="text-xs text-muted-foreground">Final Time</div>
          </div>
          
          <div className="bg-surface rounded-lg p-3 border border-border">
            <div className="text-lg font-bold text-foreground">
              {userStats.attempts}
            </div>
            <div className="text-xs text-muted-foreground">Attempts</div>
          </div>
        </div>

        <button
          onClick={onRestartRequest}
          className="
            px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium
            hover:bg-primary/90 transition-colors duration-200
            flex items-center space-x-2 mx-auto
          "
        >
          <Icon name="RotateCcw" size={16} />
          <span>New Challenge</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-competitive">
      {/* Timer and Status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Icon name="Timer" size={20} className="text-primary" />
            <span className={`text-xl font-mono font-bold ${getTimerColor()}`}>
              {formatTime(competitionStatus.timeRemaining)}
            </span>
          </div>
          
          {competitionStatus.timeRemaining < 60 && (
            <div className="flex items-center space-x-1 text-error">
              <Icon name="AlertTriangle" size={16} />
              <span className="text-sm font-medium">Hurry up!</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <div className={`
            w-2 h-2 rounded-full animate-pulse
            ${competitionStatus.isActive ? 'bg-success' : 'bg-warning'}
          `} />
          <span className="text-sm text-muted-foreground">
            {competitionStatus.isActive ? 'Battle Active' : 'Waiting...'}
          </span>
        </div>
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="text-center">
          <div className="text-lg font-bold text-foreground">
            {userStats.attempts}
          </div>
          <div className="text-xs text-muted-foreground">Attempts</div>
        </div>
        
        <div className="text-center">
          <div className="text-lg font-bold text-foreground">
            {userStats.testsPassed}/{userStats.totalTests}
          </div>
          <div className="text-xs text-muted-foreground">Tests</div>
        </div>
        
        <div className="text-center">
          <div className="text-lg font-bold text-foreground">
            {userStats.codeLines}
          </div>
          <div className="text-xs text-muted-foreground">Lines</div>
        </div>
        
        <div className="text-center">
          <div className="text-lg font-bold text-foreground">
            {userStats.accuracy}%
          </div>
          <div className="text-xs text-muted-foreground">Accuracy</div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Your Progress</span>
          <span className="text-xs text-foreground font-medium">
            {Math.round((userStats.testsPassed / userStats.totalTests) * 100)}%
          </span>
        </div>
        
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ 
              width: `${(userStats.testsPassed / userStats.totalTests) * 100}%` 
            }}
          />
        </div>
      </div>

      {/* Recent Activity */}
      {userStats.lastSubmission && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Last Submission:</span>
            <div className="flex items-center space-x-2">
              <Icon 
                name={userStats.lastSubmission.success ? "CheckCircle" : "XCircle"} 
                size={12} 
                className={userStats.lastSubmission.success ? "text-success" : "text-error"}
              />
              <span className="text-xs text-foreground">
                {userStats.lastSubmission.time}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompetitionStatus;