/**
 * Auth Debug Panel - Helps diagnose authentication issues
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TokenManager, apiService } from '@/services/apiService';
import { useAuth } from '@/hooks/useAuth';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

export const AuthDebugPanel = () => {
  const { user, token, isAuthenticated } = useAuth();
  const [debugInfo, setDebugInfo] = useState({
    storedToken: null as string | null,
    tokenExpired: false,
    tokenPayload: null as any,
    apiServiceToken: null as string | null,
    authHeader: null as string | null,
  });

  const refreshDebugInfo = () => {
    const storedToken = TokenManager.getToken();
    const apiToken = apiService.getAuthToken();
    
    let tokenPayload = null;
    let tokenExpired = false;
    
    if (storedToken) {
      tokenPayload = TokenManager.getTokenPayload(storedToken);
      tokenExpired = TokenManager.isTokenExpired(storedToken);
    }

    // Get the actual auth header that would be sent
    const authHeader = apiToken ? `Bearer ${apiToken}` : null;

    setDebugInfo({
      storedToken,
      tokenExpired,
      tokenPayload,
      apiServiceToken: apiToken,
      authHeader,
    });
  };

  useEffect(() => {
    refreshDebugInfo();
  }, [token, isAuthenticated]);

  const handleFixToken = () => {
    const storedToken = TokenManager.getToken();
    if (storedToken && !TokenManager.isTokenExpired(storedToken)) {
      apiService.setAuthToken(storedToken);
      refreshDebugInfo();
    }
  };

  const handleClearToken = () => {
    TokenManager.clearToken();
    apiService.clearAuthToken();
    refreshDebugInfo();
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Authentication Debug Panel
          <Button size="sm" variant="outline" onClick={refreshDebugInfo}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </CardTitle>
        <CardDescription>
          Diagnose authentication issues and token problems
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Authentication Status */}
        <div className="space-y-2">
          <h3 className="font-semibold">Authentication Status</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <span>Is Authenticated: {isAuthenticated ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center gap-2">
              {user ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <span>User Loaded: {user ? 'Yes' : 'No'}</span>
            </div>
          </div>
          {user && (
            <div className="text-sm text-muted-foreground">
              User: {user.email} (ID: {user.id})
            </div>
          )}
        </div>

        {/* Token Status */}
        <div className="space-y-2">
          <h3 className="font-semibold">Token Status</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {debugInfo.storedToken ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <span>Token in LocalStorage: {debugInfo.storedToken ? 'Present' : 'Missing'}</span>
            </div>
            
            <div className="flex items-center gap-2">
              {debugInfo.apiServiceToken ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <span>Token in API Service: {debugInfo.apiServiceToken ? 'Present' : 'Missing'}</span>
            </div>

            {debugInfo.storedToken && (
              <div className="flex items-center gap-2">
                {debugInfo.tokenExpired ? (
                  <XCircle className="w-5 h-5 text-red-600" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
                <span>Token Valid: {debugInfo.tokenExpired ? 'Expired' : 'Valid'}</span>
              </div>
            )}

            {debugInfo.authHeader && (
              <div className="text-sm">
                <span className="font-medium">Auth Header: </span>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {debugInfo.authHeader.substring(0, 50)}...
                </code>
              </div>
            )}
          </div>
        </div>

        {/* Token Payload */}
        {debugInfo.tokenPayload && (
          <div className="space-y-2">
            <h3 className="font-semibold">Token Payload</h3>
            <div className="text-sm space-y-1">
              <div>User ID: {debugInfo.tokenPayload.userId || debugInfo.tokenPayload.sub}</div>
              <div>Email: {debugInfo.tokenPayload.email}</div>
              <div>Role: {debugInfo.tokenPayload.role}</div>
              {debugInfo.tokenPayload.exp && (
                <div>
                  Expires: {new Date(debugInfo.tokenPayload.exp * 1000).toLocaleString()}
                </div>
              )}
              {debugInfo.tokenPayload.iat && (
                <div>
                  Issued: {new Date(debugInfo.tokenPayload.iat * 1000).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Issues and Fixes */}
        {!isAuthenticated && debugInfo.storedToken && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p>Token exists but authentication failed. Possible issues:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {debugInfo.tokenExpired && <li>Token has expired</li>}
                  {!debugInfo.apiServiceToken && <li>Token not set in API service</li>}
                  {debugInfo.storedToken !== debugInfo.apiServiceToken && (
                    <li>Token mismatch between storage and API service</li>
                  )}
                </ul>
                <div className="flex gap-2 mt-2">
                  {!debugInfo.tokenExpired && !debugInfo.apiServiceToken && (
                    <Button size="sm" onClick={handleFixToken}>
                      Fix: Set Token in API Service
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={handleClearToken}>
                    Clear All Tokens
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Context State */}
        <div className="space-y-2">
          <h3 className="font-semibold">Context State</h3>
          <div className="text-sm space-y-1">
            <div>Token in Context: {token ? 'Present' : 'Missing'}</div>
            <div>Tokens Match: {token === debugInfo.storedToken ? 'Yes' : 'No'}</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <h3 className="font-semibold">Quick Actions</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={refreshDebugInfo}>
              Refresh Info
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
              Reload Page
            </Button>
            <Button size="sm" variant="outline" onClick={() => {
              console.log('Debug Info:', debugInfo);
              console.log('User:', user);
              console.log('Token:', token);
            }}>
              Log to Console
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
