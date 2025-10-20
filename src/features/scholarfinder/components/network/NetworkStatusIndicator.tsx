/**
 * Network status indicator and offline handling for ScholarFinder
 * Provides visual feedback and offline mode capabilities
 */

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useNetworkStatus } from '../../hooks/useErrorRecovery';
import { useScholarFinderToasts } from '../notifications/ToastNotificationSystem';
import { cn } from '@/lib/utils';

interface NetworkStatusIndicatorProps {
  showFullAlert?: boolean;
  className?: string;
}

export function NetworkStatusIndicator({ showFullAlert = false, className }: NetworkStatusIndicatorProps) {
  const { isOnline, wasOffline } = useNetworkStatus();
  const toasts = useScholarFinderToasts();

  if (isOnline && !showFullAlert) {
    return null; // Don't show anything when online unless explicitly requested
  }

  if (showFullAlert && !isOnline) {
    return (
      <Alert variant="destructive" className={cn("mb-4", className)}>
        <WifiOff className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">You're currently offline</p>
              <p className="text-sm mt-1">
                Some features may not work properly. Please check your internet connection.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Compact indicator
  return (
    <Badge 
      variant={isOnline ? "default" : "destructive"} 
      className={cn("flex items-center gap-1", className)}
    >
      {isOnline ? (
        <>
          <Wifi className="h-3 w-3" />
          Online
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          Offline
        </>
      )}
    </Badge>
  );
}

/**
 * Offline mode handler component
 */
interface OfflineModeHandlerProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function OfflineModeHandler({ children, fallback }: OfflineModeHandlerProps) {
  const { isOnline } = useNetworkStatus();
  const [offlineData, setOfflineData] = useState<any>(null);

  useEffect(() => {
    // Load offline data when going offline
    if (!isOnline) {
      const savedData = localStorage.getItem('scholarfinder-offline-data');
      if (savedData) {
        try {
          setOfflineData(JSON.parse(savedData));
        } catch (error) {
          console.error('Failed to parse offline data:', error);
        }
      }
    }
  }, [isOnline]);

  if (!isOnline) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-[400px] flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <WifiOff className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">You're offline</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  ScholarFinder requires an internet connection to function properly.
                  Please check your connection and try again.
                </p>
              </div>
              
              {offlineData && (
                <div className="text-left">
                  <h4 className="text-sm font-medium mb-2">Cached Data Available:</h4>
                  <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    <p>• Process: {offlineData.processTitle || 'Unknown'}</p>
                    <p>• Last updated: {offlineData.lastUpdated || 'Unknown'}</p>
                    <p>• Step: {offlineData.currentStep || 'Unknown'}</p>
                  </div>
                </div>
              )}

              <Button 
                onClick={() => window.location.reload()}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Hook for offline data management
 */
export function useOfflineData() {
  const { isOnline } = useNetworkStatus();

  const saveOfflineData = (key: string, data: any) => {
    try {
      const offlineData = {
        ...data,
        lastUpdated: new Date().toISOString(),
        savedOffline: true,
      };
      localStorage.setItem(`scholarfinder-offline-${key}`, JSON.stringify(offlineData));
    } catch (error) {
      console.error('Failed to save offline data:', error);
    }
  };

  const getOfflineData = (key: string) => {
    try {
      const data = localStorage.getItem(`scholarfinder-offline-${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get offline data:', error);
      return null;
    }
  };

  const clearOfflineData = (key?: string) => {
    try {
      if (key) {
        localStorage.removeItem(`scholarfinder-offline-${key}`);
      } else {
        // Clear all ScholarFinder offline data
        const keys = Object.keys(localStorage).filter(k => k.startsWith('scholarfinder-offline-'));
        keys.forEach(k => localStorage.removeItem(k));
      }
    } catch (error) {
      console.error('Failed to clear offline data:', error);
    }
  };

  const syncOfflineData = async (key: string, syncFunction: (data: any) => Promise<void>) => {
    if (!isOnline) {
      return false;
    }

    const offlineData = getOfflineData(key);
    if (offlineData && offlineData.savedOffline) {
      try {
        await syncFunction(offlineData);
        clearOfflineData(key);
        return true;
      } catch (error) {
        console.error('Failed to sync offline data:', error);
        return false;
      }
    }

    return false;
  };

  return {
    isOnline,
    saveOfflineData,
    getOfflineData,
    clearOfflineData,
    syncOfflineData,
  };
}

/**
 * Network-aware operation wrapper
 */
interface NetworkAwareOperationProps {
  children: React.ReactNode;
  requiresNetwork?: boolean;
  fallbackMessage?: string;
  onOfflineAttempt?: () => void;
}

export function NetworkAwareOperation({ 
  children, 
  requiresNetwork = true, 
  fallbackMessage,
  onOfflineAttempt 
}: NetworkAwareOperationProps) {
  const { isOnline } = useNetworkStatus();

  if (requiresNetwork && !isOnline) {
    return (
      <div className="p-4 text-center">
        <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          {fallbackMessage || 'This operation requires an internet connection.'}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => {
            if (onOfflineAttempt) {
              onOfflineAttempt();
            } else {
              window.location.reload();
            }
          }}
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Check Connection
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Connection quality indicator
 */
export function ConnectionQualityIndicator() {
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'offline'>('good');
  const [latency, setLatency] = useState<number | null>(null);
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    if (!isOnline) {
      setConnectionQuality('offline');
      return;
    }

    const checkConnectionQuality = async () => {
      try {
        const start = Date.now();
        const response = await fetch('/api/health', { 
          method: 'HEAD',
          cache: 'no-cache'
        });
        const end = Date.now();
        const responseTime = end - start;
        
        setLatency(responseTime);
        
        if (response.ok) {
          setConnectionQuality(responseTime < 1000 ? 'good' : 'poor');
        } else {
          setConnectionQuality('poor');
        }
      } catch (error) {
        setConnectionQuality('poor');
        setLatency(null);
      }
    };

    // Check immediately and then every 30 seconds
    checkConnectionQuality();
    const interval = setInterval(checkConnectionQuality, 30000);

    return () => clearInterval(interval);
  }, [isOnline]);

  const getIndicatorColor = () => {
    switch (connectionQuality) {
      case 'good':
        return 'text-green-500';
      case 'poor':
        return 'text-yellow-500';
      case 'offline':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getIndicatorIcon = () => {
    switch (connectionQuality) {
      case 'good':
        return <Wifi className="h-4 w-4" />;
      case 'poor':
        return <Wifi className="h-4 w-4" />;
      case 'offline':
        return <WifiOff className="h-4 w-4" />;
      default:
        return <Wifi className="h-4 w-4" />;
    }
  };

  return (
    <div className={cn("flex items-center gap-1 text-xs", getIndicatorColor())}>
      {getIndicatorIcon()}
      <span className="capitalize">{connectionQuality}</span>
      {latency && connectionQuality !== 'offline' && (
        <span className="text-muted-foreground">({latency}ms)</span>
      )}
    </div>
  );
}