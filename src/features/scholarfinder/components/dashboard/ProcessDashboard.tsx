/**
 * ProcessDashboard Component
 * Main dashboard for viewing and managing multiple ScholarFinder processes
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  useProcessList, 
  useProcessStatistics, 
  useCreateProcess,
  useInvalidateProcessQueries 
} from '../../hooks/useProcessManagement';
import { ProcessStatus, ProcessStep, type ProcessListFilters } from '../../types/process';
import ProcessList from '../dashboard/ProcessList';
import ProcessRecovery from '../dashboard/ProcessRecovery';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ProcessDashboardProps {
  className?: string;
}

const ProcessDashboard: React.FC<ProcessDashboardProps> = ({ className }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed' | 'failed'>('all');
  const [showRecovery, setShowRecovery] = useState(false);
  
  const invalidateQueries = useInvalidateProcessQueries();
  const createProcess = useCreateProcess();

  // Build filters based on active tab and search
  const filters: ProcessListFilters = React.useMemo(() => {
    const baseFilters: ProcessListFilters = {};
    
    if (searchTerm.trim()) {
      baseFilters.search = searchTerm.trim();
    }
    
    switch (activeTab) {
      case 'active':
        baseFilters.status = [ProcessStatus.CREATED, ProcessStatus.IN_PROGRESS];
        break;
      case 'completed':
        baseFilters.status = [ProcessStatus.COMPLETED];
        break;
      case 'failed':
        baseFilters.status = [ProcessStatus.FAILED, ProcessStatus.CANCELLED];
        break;
      default:
        // 'all' - no status filter
        break;
    }
    
    return baseFilters;
  }, [searchTerm, activeTab]);

  // Fetch data
  const { data: processes = [], isLoading, error, refetch } = useProcessList(filters);
  const { data: statistics } = useProcessStatistics();

  const handleCreateNewProcess = async () => {
    if (!user) {
      toast.error('Please log in to create a new process');
      return;
    }

    try {
      const newProcess = await createProcess.mutateAsync({
        title: `New Analysis ${new Date().toLocaleDateString()}`,
        jobId: '', // Will be set during upload
        userId: user.id,
      });

      // Navigate to the new process
      navigate(`/scholarfinder/process/${newProcess.id}`);
    } catch (error) {
      console.error('Failed to create process:', error);
    }
  };

  const handleRefresh = () => {
    refetch();
    invalidateQueries.invalidateStatistics();
    toast.success('Dashboard refreshed');
  };

  const getStatusBadgeVariant = (status: ProcessStatus) => {
    switch (status) {
      case ProcessStatus.COMPLETED:
        return 'default';
      case ProcessStatus.IN_PROGRESS:
        return 'secondary';
      case ProcessStatus.FAILED:
        return 'destructive';
      case ProcessStatus.CANCELLED:
        return 'outline';
      default:
        return 'secondary';
    }
  };

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">Failed to load dashboard</p>
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Process Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Manage your ScholarFinder manuscript analyses
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button
            onClick={handleCreateNewProcess}
            disabled={createProcess.isPending}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Analysis
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Processes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {(statistics.byStatus[ProcessStatus.CREATED] || 0) + 
                 (statistics.byStatus[ProcessStatus.IN_PROGRESS] || 0)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {statistics.byStatus[ProcessStatus.COMPLETED] || 0}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Failed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {(statistics.byStatus[ProcessStatus.FAILED] || 0) + 
                 (statistics.byStatus[ProcessStatus.CANCELLED] || 0)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Your Processes</CardTitle>
            
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search processes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRecovery(!showRecovery)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Recovery
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="failed">Failed</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-4">
              {showRecovery ? (
                <ProcessRecovery onClose={() => setShowRecovery(false)} />
              ) : (
                <ProcessList
                  processes={processes}
                  isLoading={isLoading}
                  onProcessSelect={(processId) => navigate(`/scholarfinder/process/${processId}`)}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {statistics?.recentActivity && statistics.recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your most recently updated processes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {statistics.recentActivity.slice(0, 5).map((process) => (
                <div
                  key={process.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/scholarfinder/process/${process.id}`)}
                >
                  <div className="flex-1">
                    <h4 className="font-medium">{process.title}</h4>
                    <p className="text-sm text-gray-600">
                      Updated {new Date(process.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusBadgeVariant(process.status)}>
                      {process.status}
                    </Badge>
                    <Badge variant="outline">
                      {process.currentStep}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProcessDashboard;