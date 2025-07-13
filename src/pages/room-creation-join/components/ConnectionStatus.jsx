import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';

const ConnectionStatus = () => {
  const [connectionState, setConnectionState] = useState({
    status: 'connected',
    latency: 45,
    serverRegion: 'US-East',
    lastUpdate: new Date()
  });

  useEffect(() => {
    // Simulate connection monitoring
    const interval = setInterval(() => {
      setConnectionState(prev => ({
        ...prev,
        latency: Math.floor(Math.random() * 50) + 20,
        lastUpdate: new Date()
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (connectionState.status) {
      case 'connected': return 'text-success';
      case 'connecting': return 'text-warning';
      case 'disconnected': return 'text-error';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = () => {
    switch (connectionState.status) {
      case 'connected': return 'Wifi';
      case 'connecting': return 'Loader';
      case 'disconnected': return 'WifiOff';
      default: return 'Wifi';
    }
  };

  const getLatencyColor = () => {
    if (connectionState.latency < 50) return 'text-success';
    if (connectionState.latency < 100) return 'text-warning';
    return 'text-error';
  };

  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Icon 
              name={getStatusIcon()} 
              size={16} 
              className={`${getStatusColor()} ${connectionState.status === 'connecting' ? 'animate-spin' : ''}`}
            />
            <span className={`text-sm font-medium capitalize ${getStatusColor()}`}>
              {connectionState.status}
            </span>
          </div>
          
          <div className="w-px h-4 bg-border"></div>
          
          <div className="flex items-center space-x-2">
            <Icon name="Zap" size={14} className="text-muted-foreground" />
            <span className={`text-sm font-mono ${getLatencyColor()}`}>
              {connectionState.latency}ms
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <Icon name="Globe" size={12} />
          <span>{connectionState.serverRegion}</span>
        </div>
      </div>
    </div>
  );
};

export default ConnectionStatus;