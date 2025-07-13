import React from 'react';
import Icon from '../../../components/AppIcon';

const LoadingOverlay = ({ isVisible, message, subMessage }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-subtle flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-xl p-8 shadow-elevated max-w-md w-full mx-4 animate-slide-in">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center mx-auto">
            <Icon name="Loader" size={32} color="white" className="animate-spin" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-foreground">{message}</h3>
            {subMessage && (
              <p className="text-muted-foreground">{subMessage}</p>
            )}
          </div>

          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;