import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { useAdminUsers } from '@/hooks/useAdmin';
import { apiService, TokenManager } from '@/services/apiService';
import { authService } from '@/services/authService';

export const AdminDebug: React.FC = () => {
  const { user } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [apiTest, setApiTest] = useState<any>({});
  
  // Use the same hook as UserManagement
  const { 
    data: usersData, 
    isLoading: usersLoading, 
    error: usersError,
    refetch: refetchUsers
  } = useAdminUsers({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  useEffect(() => {
    // Collect debug information
    const storedToken = TokenManager.getToken();
    const apiToken = apiService.getAuthToken();
    
    const info = {
      user: user ? {
        id: user.id,
        email: user.email,
        role: user.role
      } : null,
      storedToken: storedToken ? {
        exists: true,
        length: storedToken.length,
        preview: storedToken.substring(0, 20) + '...',
        isExpired: checkTokenExpired(storedToken)
      } : null,
      apiToken: apiToken ? {
        exists: true,
        length: apiToken.length,
        preview: apiToken.substring(0, 20) + '...',
        isExpired: checkTokenExpired(apiToken)
      } : null,
      localStorage: {
        token: localStorage.getItem('scholarfinder_token') ? 'exists' : 'missing',
        refreshToken: localStorage.getItem('scholarfinder_refresh_token') ? 'exists' : 'missing'
      },
      apiService: {
        isAuthenticated: apiService.isAuthenticated(),
        authToken: apiService.getAuthToken() ? 'exists' : 'missing'
      },
      tokenMismatch: !!(storedToken && !apiToken)
    };
    setDebugInfo(info);
  }, [user]);

  const checkTokenExpired = (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  };

  const restoreToken = () => {
    const storedToken = TokenManager.getToken();
    if (storedToken && !TokenManager.isTokenExpired(storedToken)) {
      apiService.setAuthToken(storedToken);
      setDebugInfo(prev => ({ ...prev, tokenRestored: true }));
      // Refresh the debug info
      window.location.reload();
    }
  };

  const testApiDirectly = async () => {
    try {
      setApiTest({ loading: true });
      
      console.log('=== DEBUG: Testing API directly ===');
      console.log('Current URL:', window.location.href);
      console.log('Frontend port:', window.location.port);
      console.log('VITE_API_BASE_URL env var:', import.meta.env.VITE_API_BASE_URL);
      
      // Import config dynamically to see what it contains
      const configModule = await import('@/lib/config');
      console.log('Config apiBaseUrl:', configModule.config.apiBaseUrl);
      console.log('Full config object:', configModule.config);
      console.log('Token in localStorage:', TokenManager.getToken()?.substring(0, 20) + '...');
      console.log('Token in apiService:', apiService.getAuthToken()?.substring(0, 20) + '...');
      console.log('API Service authenticated:', apiService.isAuthenticated());
      
      // Check the actual axios instance configuration
      console.log('Axios baseURL:', (apiService as any).axiosInstance?.defaults?.baseURL);
      
      // Test the API directly with detailed logging
      console.log('About to call apiService.get("/api/admin/users")');
      
      // Try both with and without parameters
      try {
        console.log('Trying with default parameters...');
        const response = await apiService.get('/api/admin/users');
        console.log('Success with default parameters:', response);
        
        setApiTest({
          success: true,
          data: response,
          userCount: response.data?.length || 0
        });
        return;
      } catch (error1) {
        console.log('Failed with default parameters, trying without cache-busting...');
        
        // Try making a direct axios call without the cache-busting timestamp
        try {
          const directResponse = await fetch('http://localhost:3002/api/admin/users', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${apiService.getAuthToken()}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!directResponse.ok) {
            throw new Error(`HTTP ${directResponse.status}: ${directResponse.statusText}`);
          }
          
          const data = await directResponse.json();
          console.log('Success with direct fetch:', data);
          
          setApiTest({
            success: true,
            data: data,
            userCount: data.data?.length || 0,
            method: 'direct fetch'
          });
          return;
        } catch (error2) {
          console.log('Both methods failed');
          throw error1; // Throw the original error
        }
      }
      
      console.log('=== DEBUG: API Response ===');
      console.log('Full response:', response);
      
      setApiTest({
        success: true,
        data: response,
        userCount: response.data?.length || 0
      });
    } catch (error: any) {
      console.error('=== DEBUG: API Error ===');
      console.error('Full error:', error);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      
      setApiTest({
        success: false,
        error: {
          message: error.message,
          type: error.type,
          status: error.response?.status,
          responseData: error.response?.data
        }
      });
    }
  };

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Admin Debug Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Authentication Status */}
          <div>
            <h4 className="font-semibold mb-2">Authentication Status</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span>User:</span>
                <Badge variant={debugInfo.user ? 'default' : 'destructive'}>
                  {debugInfo.user ? `${debugInfo.user.email} (${debugInfo.user.role})` : 'Not logged in'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span>Stored Token:</span>
                <Badge variant={debugInfo.storedToken?.exists ? 'default' : 'destructive'}>
                  {debugInfo.storedToken?.exists ? 
                    `${debugInfo.storedToken.preview} (Expired: ${debugInfo.storedToken.isExpired})` : 
                    'Missing'
                  }
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span>API Token:</span>
                <Badge variant={debugInfo.apiToken?.exists ? 'default' : 'destructive'}>
                  {debugInfo.apiToken?.exists ? 
                    `${debugInfo.apiToken.preview} (Expired: ${debugInfo.apiToken.isExpired})` : 
                    'Missing'
                  }
                </Badge>
              </div>
              {debugInfo.tokenMismatch && (
                <Alert>
                  <AlertDescription>
                    <strong>Token Mismatch:</strong> Token exists in storage but not in API service. This is likely the cause of the issue.
                  </AlertDescription>
                </Alert>
              )}
              <div className="flex items-center gap-2">
                <span>API Service:</span>
                <Badge variant={debugInfo.apiService?.isAuthenticated ? 'default' : 'destructive'}>
                  {debugInfo.apiService?.isAuthenticated ? 'Authenticated' : 'Not authenticated'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Hook Status */}
          <div>
            <h4 className="font-semibold mb-2">useAdminUsers Hook Status</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span>Loading:</span>
                <Badge variant={usersLoading ? 'secondary' : 'outline'}>
                  {usersLoading ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span>Error:</span>
                <Badge variant={usersError ? 'destructive' : 'default'}>
                  {usersError ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span>Data:</span>
                <Badge variant={usersData ? 'default' : 'outline'}>
                  {usersData ? `${usersData.data?.length || 0} users` : 'No data'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Error Details */}
          {usersError && (
            <Alert>
              <AlertDescription>
                <strong>Error:</strong> {JSON.stringify(usersError, null, 2)}
              </AlertDescription>
            </Alert>
          )}

          {/* Data Details */}
          {usersData && (
            <div>
              <h4 className="font-semibold mb-2">Users Data</h4>
              <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                {JSON.stringify(usersData, null, 2)}
              </pre>
            </div>
          )}

          {/* API Test */}
          <div>
            <h4 className="font-semibold mb-2">Direct API Test</h4>
            <Button onClick={testApiDirectly} disabled={apiTest.loading}>
              {apiTest.loading ? 'Testing...' : 'Test API Directly'}
            </Button>
            
            {apiTest.success !== undefined && (
              <div className="mt-2">
                <Badge variant={apiTest.success ? 'default' : 'destructive'}>
                  {apiTest.success ? `Success: ${apiTest.userCount} users` : 'Failed'}
                </Badge>
                {apiTest.error && (
                  <pre className="bg-red-50 p-2 rounded text-sm mt-2">
                    {JSON.stringify(apiTest.error, null, 2)}
                  </pre>
                )}
                {apiTest.data && (
                  <pre className="bg-green-50 p-2 rounded text-sm mt-2 max-h-40 overflow-auto">
                    {JSON.stringify(apiTest.data, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {debugInfo.tokenMismatch && (
              <Button onClick={restoreToken} className="bg-green-600 hover:bg-green-700">
                Restore Token
              </Button>
            )}
            <Button variant="outline" onClick={() => refetchUsers()}>
              Refetch Users
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};