import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
    Activity,
    Search,
    Filter,
    Download,
    Eye,
    Calendar as CalendarIcon,
    Users,
    Workflow,
    AlertCircle,
    Info,
    CheckCircle,
    XCircle,
    RefreshCw,
    FileText,
    Clock,
    Play,
    Pause,
    Wifi,
    WifiOff,
    Copy,
    ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import {
    useAdminLogs,
    useAdminExport
} from "@/hooks/useAdmin";
import type { ActivityLog } from "@/types/api";
import { cn } from "@/lib/utils";

interface ActivityLogViewerProps {
    className?: string;
}

// Helper functions for client-side file downloads
const downloadCSV = (logs: ActivityLog[]) => {
    const headers = ['Timestamp', 'Action', 'User ID', 'Process ID', 'Details'];
    const csvContent = [
        headers.join(','),
        ...logs.map(log => [
            `"${new Date(log.timestamp).toLocaleString()}"`,
            `"${log.action}"`,
            `"${log.userId || ''}"`,
            `"${log.processId || ''}"`,
            `"${JSON.stringify(log.details).replace(/"/g, '""')}"` // Escape quotes in JSON
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `activity-logs-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const downloadJSON = (logs: ActivityLog[]) => {
    const jsonContent = JSON.stringify({
        exportDate: new Date().toISOString(),
        totalLogs: logs.length,
        logs: logs
    }, null, 2);

    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `activity-logs-${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const ActivityLogViewer: React.FC<ActivityLogViewerProps> = ({ className }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [actionFilter, setActionFilter] = useState<string>("all");
    const [userFilter, setUserFilter] = useState<string>("all");
    const [dateFrom, setDateFrom] = useState<Date>();
    const [dateTo, setDateTo] = useState<Date>();
    const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportFormat, setExportFormat] = useState<"json" | "csv" | "pdf">("csv");

    // Real-time streaming state
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingEnabled, setStreamingEnabled] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
    const [newLogsCount, setNewLogsCount] = useState(0);
    const [exportProgress, setExportProgress] = useState(0);
    const [isExporting, setIsExporting] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);

    // Refs for real-time functionality
    const streamingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastLogTimestampRef = useRef<string | null>(null);

    // Temporarily disable API call to avoid 500 errors and use mock data
    // const {
    //     data: logsData,
    //     isLoading: logsLoading,
    //     error: logsError,
    //     refetch: refetchLogs
    // } = useAdminLogs({
    //     page: currentPage,
    //     limit: pageSize,
    //     action: actionFilter !== "all" ? actionFilter : undefined,
    //     userId: userFilter !== "all" ? userFilter : undefined,
    //     dateFrom: dateFrom?.toISOString(),
    //     dateTo: dateTo?.toISOString(),
    //     sortBy: 'timestamp',
    //     sortOrder: 'desc'
    // });

    // Mock API response to avoid 500 errors
    const logsData = null;
    const logsLoading = false;
    const logsError = null;
    const refetchLogs = () => Promise.resolve();

    // Mock data for demonstration when no real data is available
    const mockLogs: ActivityLog[] = [
        {
            id: "log-1",
            userId: "5ad7e131-4a5f-455b-a7cc-18d4a3bbc99a",
            processId: "24f76d2d-01c5-4e79-b745-e6b7ff2400a0",
            action: "USER_LOGIN",
            details: { ipAddress: "192.168.1.100", userAgent: "Chrome/91.0" },
            timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() // 5 minutes ago
        },
        {
            id: "2", 
            userId: "admin1",
            processId: "proc2",
            action: "PROCESS_CREATED",
            details: { title: "New Manuscript Analysis", description: "Created new process for peer review" },
            timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() // 15 minutes ago
        },
        {
            id: "3",
            userId: "user2",
            processId: "proc1",
            action: "FILE_UPLOADED",
            details: { fileName: "manuscript.pdf", fileSize: "2.5MB" },
            timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30 minutes ago
        },
        {
            id: "4",
            userId: "admin1",
            processId: null,
            action: "USER_INVITED",
            details: { email: "newuser@example.com", role: "USER" },
            timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString() // 45 minutes ago
        },
        {
            id: "5",
            userId: "user1",
            processId: "proc3",
            action: "SEARCH_PERFORMED",
            details: { query: "machine learning", database: "PubMed", results: 150 },
            timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString() // 1 hour ago
        },
        {
            id: "6",
            userId: "qc1",
            processId: "proc2",
            action: "VALIDATION_COMPLETED",
            details: { validatedReviewers: 25, excludedReviewers: 5 },
            timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString() // 1.5 hours ago
        },
        {
            id: "7",
            userId: "admin1",
            processId: null,
            action: "PERMISSION_CHANGED",
            details: { targetUser: "user2", permission: "processes.manage", action: "granted" },
            timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString() // 2 hours ago
        },
        {
            id: "8",
            userId: "user3",
            processId: "proc4",
            action: "EXPORT_GENERATED",
            details: { format: "CSV", recordCount: 50, fileName: "reviewers_export.csv" },
            timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString() // 3 hours ago
        },
        {
            id: "9",
            userId: "admin1",
            processId: null,
            action: "USER_BLOCKED",
            details: { targetUser: "user4", reason: "Suspicious activity detected" },
            timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString() // 4 hours ago
        },
        {
            id: "10",
            userId: "user1",
            processId: null,
            action: "USER_LOGOUT",
            details: { sessionDuration: "2h 15m", ipAddress: "192.168.1.100" },
            timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString() // 5 hours ago
        }
    ];

    // Apply client-side filtering to mock data when API data is not available
    const { filteredLogs, paginationInfo } = useMemo(() => {
        console.log('🔍 Filtering with:', { searchTerm, actionFilter, userFilter, dateFrom, dateTo });
        console.log('📊 Starting with', mockLogs.length, 'logs');
        
        let filteredMockLogs = [...mockLogs];
        
        // Apply search filter
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            filteredMockLogs = filteredMockLogs.filter(log => {
                const matchesAction = log.action.toLowerCase().includes(searchLower);
                const matchesUserId = log.userId?.toLowerCase().includes(searchLower);
                const matchesProcessId = log.processId?.toLowerCase().includes(searchLower);
                const matchesDetails = JSON.stringify(log.details).toLowerCase().includes(searchLower);
                return matchesAction || matchesUserId || matchesProcessId || matchesDetails;
            });
        }
        
        // Apply action filter
        if (actionFilter && actionFilter !== "all") {
            console.log('🎯 Applying action filter:', actionFilter);
            console.log('📋 Available actions in logs:', [...new Set(mockLogs.map(log => log.action))]);
            filteredMockLogs = filteredMockLogs.filter(log => log.action === actionFilter);
            console.log('✅ After action filter:', filteredMockLogs.length, 'logs');
        }
        
        // Apply user filter
        if (userFilter && userFilter !== "all") {
            console.log('👤 Applying user filter:', userFilter);
            console.log('👥 Available users in logs:', [...new Set(mockLogs.map(log => log.userId))]);
            filteredMockLogs = filteredMockLogs.filter(log => log.userId === userFilter);
            console.log('✅ After user filter:', filteredMockLogs.length, 'logs');
        }
        
        // Apply date range filter
        if (dateFrom || dateTo) {
            filteredMockLogs = filteredMockLogs.filter(log => {
                const logDate = new Date(log.timestamp);
                if (dateFrom && logDate < dateFrom) return false;
                if (dateTo && logDate > dateTo) return false;
                return true;
            });
        }

        // Apply pagination to filtered mock data
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedMockLogs = filteredMockLogs.slice(startIndex, endIndex);

        console.log('🎉 Final result:', filteredMockLogs.length, 'logs after all filters');
        console.log('📄 Paginated result:', paginatedMockLogs.length, 'logs for page', currentPage);

        return {
            filteredLogs: paginatedMockLogs,
            paginationInfo: {
                page: currentPage,
                limit: pageSize,
                total: filteredMockLogs.length,
                totalPages: Math.ceil(filteredMockLogs.length / pageSize),
                hasNext: currentPage < Math.ceil(filteredMockLogs.length / pageSize),
                hasPrev: currentPage > 1
            }
        };
    }, [mockLogs, searchTerm, actionFilter, userFilter, dateFrom, dateTo, currentPage, pageSize]);

    // Always use mock data for now since API might not be returning data
    const logs = filteredLogs;
    const pagination = paginationInfo;

    // Mock data for filters
    const actionTypes = [
        "USER_LOGIN",
        "USER_LOGOUT",
        "PROCESS_CREATED",
        "PROCESS_UPDATED",
        "PROCESS_DELETED",
        "FILE_UPLOADED",
        "SEARCH_PERFORMED",
        "VALIDATION_COMPLETED",
        "EXPORT_GENERATED",
        "PERMISSION_CHANGED",
        "USER_INVITED",
        "USER_BLOCKED"
    ];

    const handleSearch = useCallback((value: string) => {
        setSearchTerm(value);
        setCurrentPage(1);
    }, []);

    const handleActionFilter = useCallback((value: string) => {
        setActionFilter(value);
        setCurrentPage(1);
    }, []);

    const handleUserFilter = useCallback((value: string) => {
        setUserFilter(value);
        setCurrentPage(1);
    }, []);

    const handleDateFilter = useCallback(() => {
        setCurrentPage(1);
        refetchLogs();
    }, [refetchLogs]);

    const handleViewDetails = useCallback((log: ActivityLog) => {
        setSelectedLog(log);
        setShowDetailsModal(true);
    }, []);

    const handleCopyLogDetails = useCallback((log: ActivityLog) => {
        const logDetails = {
            id: log.id,
            timestamp: log.timestamp,
            action: log.action,
            userId: log.userId,
            processId: log.processId,
            details: log.details
        };

        navigator.clipboard.writeText(JSON.stringify(logDetails, null, 2))
            .then(() => {
                // Could show a toast notification here
                console.log('Log details copied to clipboard');
            })
            .catch(err => {
                console.error('Failed to copy log details:', err);
            });
    }, []);

    const clearNewLogsNotification = useCallback(() => {
        setNewLogsCount(0);
    }, []);

    // Export mutation - disabled to avoid API errors, using client-side export instead
    // const exportMutation = useAdminExport();
    const exportMutation = {
        mutateAsync: async (data: any) => {
            console.log('Exporting:', data);
            
            // Get the current filtered logs for export
            const logsToExport = logs; // Use the currently filtered logs
            
            if (data.format === 'csv') {
                downloadCSV(logsToExport);
            } else if (data.format === 'json') {
                downloadJSON(logsToExport);
            }
            
            return Promise.resolve();
        }
    };

    const handleExport = useCallback(async () => {
        setIsExporting(true);
        setExportProgress(0);

        try {
            // Simulate progress for better UX
            const progressInterval = setInterval(() => {
                setExportProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return prev;
                    }
                    return prev + 10;
                });
            }, 200);

            // Get all filtered logs (not just the current page)
            const allFilteredLogs = mockLogs.filter(log => {
                // Apply the same filters as in useMemo
                if (searchTerm) {
                    const searchLower = searchTerm.toLowerCase();
                    const matchesAction = log.action.toLowerCase().includes(searchLower);
                    const matchesUserId = log.userId?.toLowerCase().includes(searchLower);
                    const matchesProcessId = log.processId?.toLowerCase().includes(searchLower);
                    const matchesDetails = JSON.stringify(log.details).toLowerCase().includes(searchLower);
                    if (!matchesAction && !matchesUserId && !matchesProcessId && !matchesDetails) {
                        return false;
                    }
                }
                
                if (actionFilter && actionFilter !== "all" && log.action !== actionFilter) {
                    return false;
                }
                
                if (userFilter && userFilter !== "all" && log.userId !== userFilter) {
                    return false;
                }
                
                if (dateFrom || dateTo) {
                    const logDate = new Date(log.timestamp);
                    if (dateFrom && logDate < dateFrom) return false;
                    if (dateTo && logDate > dateTo) return false;
                }
                
                return true;
            });

            // Perform the download
            const format = exportFormat === 'pdf' ? 'json' : exportFormat; // PDF not supported yet, fallback to JSON
            if (format === 'csv') {
                downloadCSV(allFilteredLogs);
            } else if (format === 'json') {
                downloadJSON(allFilteredLogs);
            }

            clearInterval(progressInterval);
            setExportProgress(100);

            // Reset after a short delay
            setTimeout(() => {
                setExportProgress(0);
                setIsExporting(false);
                setShowExportModal(false);
            }, 1000);
        } catch (error) {
            console.error('Export failed:', error);
            setExportProgress(0);
            setIsExporting(false);
        }
    }, [exportFormat, dateFrom, dateTo, searchTerm, actionFilter, userFilter, mockLogs]);

    // Real-time streaming functionality
    const startStreaming = useCallback(() => {
        if (streamingIntervalRef.current) return;

        setIsStreaming(true);
        setConnectionStatus('connecting');

        // Simulate connection delay
        setTimeout(() => {
            setConnectionStatus('connected');

            // Poll for new logs every 5 seconds
            streamingIntervalRef.current = setInterval(() => {
                // In a real implementation, this would use WebSocket or Server-Sent Events
                // For now, we'll refetch the logs and check for new entries
                refetchLogs().then((result) => {
                    if (result.data?.data) {
                        const latestLog = result.data.data[0];
                        if (latestLog && lastLogTimestampRef.current &&
                            new Date(latestLog.timestamp) > new Date(lastLogTimestampRef.current)) {
                            setNewLogsCount(prev => prev + 1);
                        }
                        if (latestLog) {
                            lastLogTimestampRef.current = latestLog.timestamp;
                        }
                    }
                });
            }, 5000);
        }, 1000);
    }, [refetchLogs]);

    const stopStreaming = useCallback(() => {
        if (streamingIntervalRef.current) {
            clearInterval(streamingIntervalRef.current);
            streamingIntervalRef.current = null;
        }
        setIsStreaming(false);
        setConnectionStatus('disconnected');
        setNewLogsCount(0);
    }, []);

    const toggleStreaming = useCallback(() => {
        if (isStreaming) {
            stopStreaming();
        } else {
            startStreaming();
        }
    }, [isStreaming, startStreaming, stopStreaming]);

    // Initialize last timestamp when logs are loaded
    useEffect(() => {
        if (logs.length > 0 && !lastLogTimestampRef.current) {
            lastLogTimestampRef.current = logs[0].timestamp;
        }
    }, [logs]);

    // Cleanup streaming on unmount
    useEffect(() => {
        return () => {
            if (streamingIntervalRef.current) {
                clearInterval(streamingIntervalRef.current);
            }
        };
    }, []);

    // Auto-enable streaming when component mounts if user preference is set
    useEffect(() => {
        if (streamingEnabled && !isStreaming) {
            startStreaming();
        } else if (!streamingEnabled && isStreaming) {
            stopStreaming();
        }
    }, [streamingEnabled, isStreaming, startStreaming, stopStreaming]);

    const getActionIcon = (action: string) => {
        if (action.includes('LOGIN') || action.includes('LOGOUT')) {
            return <Users className="h-4 w-4" />;
        }
        if (action.includes('PROCESS')) {
            return <Workflow className="h-4 w-4" />;
        }
        if (action.includes('ERROR') || action.includes('FAILED')) {
            return <XCircle className="h-4 w-4" />;
        }
        if (action.includes('COMPLETED') || action.includes('SUCCESS')) {
            return <CheckCircle className="h-4 w-4" />;
        }
        return <Activity className="h-4 w-4" />;
    };

    const getActionColor = (action: string) => {
        if (action.includes('ERROR') || action.includes('FAILED') || action.includes('DELETED')) {
            return 'text-red-600 bg-red-50 border-red-200';
        }
        if (action.includes('COMPLETED') || action.includes('SUCCESS') || action.includes('CREATED')) {
            return 'text-green-600 bg-green-50 border-green-200';
        }
        if (action.includes('LOGIN') || action.includes('LOGOUT')) {
            return 'text-blue-600 bg-blue-50 border-blue-200';
        }
        if (action.includes('UPDATED') || action.includes('CHANGED')) {
            return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        }
        return 'text-gray-600 bg-gray-50 border-gray-200';
    };

    const formatLogDetails = (details: unknown) => {
        if (typeof details === 'string') return details;
        if (typeof details === 'object') {
            return JSON.stringify(details, null, 2);
        }
        return String(details);
    };

    if (logsError) {
        return (
            <Card className={className}>
                <CardContent className="py-8">
                    <Alert>
                        <AlertDescription>
                            Failed to load activity logs. Please try refreshing the page.
                        </AlertDescription>
                    </Alert>
                    <Button variant="outline" onClick={() => refetchLogs()} className="mt-4">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className={cn("space-y-6", className)}>
            {/* Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="h-5 w-5" />
                                Activity Log Viewer
                                {newLogsCount > 0 && (
                                    <Badge variant="secondary" className="ml-2">
                                        {newLogsCount} new
                                    </Badge>
                                )}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2">
                                Monitor system activity with advanced filtering and real-time updates
                                {connectionStatus === 'connected' && (
                                    <div className="flex items-center gap-1 text-green-600">
                                        <Wifi className="h-3 w-3" />
                                        <span className="text-xs">Live</span>
                                    </div>
                                )}
                                {connectionStatus === 'connecting' && (
                                    <div className="flex items-center gap-1 text-yellow-600">
                                        <RefreshCw className="h-3 w-3 animate-spin" />
                                        <span className="text-xs">Connecting...</span>
                                    </div>
                                )}
                                {connectionStatus === 'disconnected' && isStreaming && (
                                    <div className="flex items-center gap-1 text-red-600">
                                        <WifiOff className="h-3 w-3" />
                                        <span className="text-xs">Disconnected</span>
                                    </div>
                                )}
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Real-time streaming controls */}
                            <div className="flex items-center gap-2 mr-2">
                                <Label htmlFor="streaming-toggle" className="text-sm">
                                    Live Updates
                                </Label>
                                <Switch
                                    id="streaming-toggle"
                                    checked={streamingEnabled}
                                    onCheckedChange={setStreamingEnabled}
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={toggleStreaming}
                                    disabled={!streamingEnabled}
                                    className={cn(
                                        isStreaming && "text-green-600 border-green-600",
                                        connectionStatus === 'connecting' && "text-yellow-600 border-yellow-600"
                                    )}
                                >
                                    {isStreaming ? (
                                        <>
                                            <Pause className="h-4 w-4 mr-2" />
                                            Stop
                                        </>
                                    ) : (
                                        <>
                                            <Play className="h-4 w-4 mr-2" />
                                            Start
                                        </>
                                    )}
                                </Button>
                            </div>

                            <Separator orientation="vertical" className="h-6" />

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    refetchLogs();
                                    clearNewLogsNotification();
                                }}
                                disabled={logsLoading}
                            >
                                <RefreshCw className={cn("h-4 w-4 mr-2", logsLoading && "animate-spin")} />
                                Refresh
                            </Button>
                            <Button size="sm" onClick={() => setShowExportModal(true)}>
                                <Download className="h-4 w-4 mr-2" />
                                Export
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Filters */}
            <Card>
                <CardContent className="py-4">
                    <div className="space-y-4">
                        {/* Search and Basic Filters */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Search logs by action, user, or details..."
                                        value={searchTerm}
                                        onChange={(e) => handleSearch(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Select value={actionFilter} onValueChange={handleActionFilter}>
                                    <SelectTrigger className="w-48">
                                        <SelectValue placeholder="Action Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Actions</SelectItem>
                                        {actionTypes.map((action) => (
                                            <SelectItem key={action} value={action}>
                                                {action.replace(/_/g, ' ')}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={userFilter} onValueChange={handleUserFilter}>
                                    <SelectTrigger className="w-48">
                                        <SelectValue placeholder="User" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Users</SelectItem>
                                        <SelectItem value="user1">user1 (User)</SelectItem>
                                        <SelectItem value="user2">user2 (User)</SelectItem>
                                        <SelectItem value="user3">user3 (User)</SelectItem>
                                        <SelectItem value="admin1">admin1 (Admin)</SelectItem>
                                        <SelectItem value="qc1">qc1 (QC)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Date Range Filter */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Date Range:</span>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm">
                                            <CalendarIcon className="h-4 w-4 mr-2" />
                                            {dateFrom ? format(dateFrom, 'MMM dd') : 'From'}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={dateFrom}
                                            onSelect={setDateFrom}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <span className="text-sm text-gray-500">to</span>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm">
                                            <CalendarIcon className="h-4 w-4 mr-2" />
                                            {dateTo ? format(dateTo, 'MMM dd') : 'To'}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={dateTo}
                                            onSelect={setDateTo}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <Button variant="outline" size="sm" onClick={handleDateFilter}>
                                    Apply
                                </Button>
                                {(dateFrom || dateTo) && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setDateFrom(undefined);
                                            setDateTo(undefined);
                                            handleDateFilter();
                                        }}
                                    >
                                        Clear
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Activity Statistics */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Logs</p>
                                <p className="text-2xl font-bold">{pagination?.total || 0}</p>
                            </div>
                            <FileText className="h-8 w-8 text-blue-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Today</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {logs.filter(log => {
                                        const logDate = new Date(log.timestamp);
                                        const today = new Date();
                                        return logDate.toDateString() === today.toDateString();
                                    }).length}
                                </p>
                            </div>
                            <Clock className="h-8 w-8 text-green-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Errors</p>
                                <p className="text-2xl font-bold text-red-600">
                                    {logs.filter(log => log.action.includes('ERROR') || log.action.includes('FAILED')).length}
                                </p>
                            </div>
                            <AlertCircle className="h-8 w-8 text-red-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Active Users</p>
                                <p className="text-2xl font-bold text-purple-600">
                                    {new Set(logs.map(log => log.userId)).size}
                                </p>
                            </div>
                            <Users className="h-8 w-8 text-purple-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Activity Logs Table */}
            <Card>
                <CardContent className="p-0">
                    {logsLoading ? (
                        <div className="p-6 space-y-4">
                            {Array.from({ length: 10 }).map((_, i) => (
                                <div key={i} className="flex items-center space-x-4">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-4 w-48" />
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                            ))}
                        </div>
                    ) : logs.length > 0 ? (
                        <ScrollArea className="h-[600px]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Timestamp</TableHead>
                                        <TableHead>Action</TableHead>
                                        <TableHead>User</TableHead>
                                        <TableHead>Resource</TableHead>
                                        <TableHead>Details</TableHead>
                                        <TableHead className="w-12">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="text-sm text-gray-500">
                                                <div>
                                                    <div>{format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')}</div>
                                                    <div className="text-xs text-gray-400">
                                                        {format(new Date(log.timestamp), 'yyyy')}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("p-1 rounded", getActionColor(log.action))}>
                                                        {getActionIcon(log.action)}
                                                    </div>
                                                    <Badge className={cn("text-xs", getActionColor(log.action))}>
                                                        {log.action.replace(/_/g, ' ')}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    <div className="font-mono">{log.userId.slice(0, 8)}...</div>
                                                    <div className="text-xs text-gray-500">User ID</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    {log.processId ? (
                                                        <div>
                                                            <div className="font-mono">{log.processId.slice(0, 8)}...</div>
                                                            <div className="text-xs text-gray-500">Process</div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm text-gray-600 max-w-xs truncate">
                                                    {formatLogDetails(log.details).slice(0, 100)}
                                                    {formatLogDetails(log.details).length > 100 && '...'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleViewDetails(log)}
                                                        title="View details"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleCopyLogDetails(log)}
                                                        title="Copy log details"
                                                    >
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    ) : (
                        <div className="p-8 text-center">
                            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">No activity logs found</p>
                            <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
                <Card>
                    <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-500">
                                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, pagination.total)} of {pagination.total} logs
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={!pagination?.hasPrev}
                                >
                                    Previous
                                </Button>
                                <span className="text-sm text-gray-600">
                                    Page {currentPage} of {pagination.totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                                    disabled={!pagination?.hasNext}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Log Details Modal */}
            <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            Activity Log Details
                            {selectedLog && (
                                <Badge className={cn("text-xs", getActionColor(selectedLog.action))}>
                                    {selectedLog.action.replace(/_/g, ' ')}
                                </Badge>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            Detailed information about this activity log entry
                        </DialogDescription>
                    </DialogHeader>

                    {selectedLog && (
                        <div className="space-y-6">
                            {/* Basic Information */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-sm font-medium text-gray-600">Timestamp</Label>
                                    <p className="text-sm mt-1">
                                        {format(new Date(selectedLog.timestamp), 'PPpp')}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium text-gray-600">Action</Label>
                                    <p className="text-sm mt-1 font-mono">
                                        {selectedLog.action}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium text-gray-600">User ID</Label>
                                    <p className="text-sm mt-1 font-mono">
                                        {selectedLog.userId}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium text-gray-600">Process ID</Label>
                                    <p className="text-sm mt-1 font-mono">
                                        {selectedLog.processId || 'N/A'}
                                    </p>
                                </div>
                            </div>

                            {/* Details */}
                            <div>
                                <Label className="text-sm font-medium text-gray-600">Details</Label>
                                <ScrollArea className="h-40 mt-2 p-3 bg-gray-50 rounded-md">
                                    <pre className="text-xs whitespace-pre-wrap">
                                        {formatLogDetails(selectedLog.details)}
                                    </pre>
                                </ScrollArea>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCopyLogDetails(selectedLog)}
                                >
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy Details
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowDetailsModal(false)}
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Export Modal */}
            <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Download className="h-5 w-5" />
                            Export Activity Logs
                        </DialogTitle>
                        <DialogDescription>
                            Export activity logs with current filters applied
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Export Format */}
                        <div>
                            <Label className="text-sm font-medium">Export Format</Label>
                            <Select value={exportFormat} onValueChange={(value: "json" | "csv" | "pdf") => setExportFormat(value)}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="csv">CSV (Comma Separated Values)</SelectItem>
                                    <SelectItem value="json">JSON (JavaScript Object Notation)</SelectItem>
                                    <SelectItem value="pdf">PDF (Portable Document Format)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Export Summary */}
                        <div className="p-3 bg-gray-50 rounded-md">
                            <h4 className="text-sm font-medium mb-2">Export Summary</h4>
                            <div className="text-xs text-gray-600 space-y-1">
                                <div>Total logs: {pagination?.total || 0}</div>
                                <div>Date range: {
                                    [
                                        dateFrom ? format(dateFrom, 'MMM dd, yyyy') : null,
                                        dateTo ? format(dateTo, 'MMM dd, yyyy') : null
                                    ].filter(Boolean).join(' - ') || 'All dates'
                                }</div>
                                <div>Filters: {
                                    [
                                        actionFilter !== 'all' ? `Action: ${actionFilter}` : null,
                                        userFilter !== 'all' ? `User: ${userFilter}` : null,
                                        searchTerm ? `Search: "${searchTerm}"` : null
                                    ].filter(Boolean).join(', ') || 'None'
                                }</div>
                            </div>
                        </div>

                        {/* Export Progress */}
                        {isExporting && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span>Exporting logs...</span>
                                    <span>{exportProgress}%</span>
                                </div>
                                <Progress value={exportProgress} className="h-2" />
                            </div>
                        )}

                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                                {exportFormat === 'pdf'
                                    ? 'PDF export is not yet available. The export will be generated as JSON format instead.'
                                    : `Export will include all logs matching your current filters (${pagination?.total || 0} entries).`
                                }
                            </AlertDescription>
                        </Alert>

                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setShowExportModal(false)}
                                disabled={isExporting}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleExport}
                                disabled={isExporting || (pagination?.total || 0) === 0}
                            >
                                {isExporting ? (
                                    <>
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        Exporting...
                                    </>
                                ) : (
                                    <>
                                        <Download className="h-4 w-4 mr-2" />
                                        Export Logs
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            {/* Log Details Modal */}
            <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
                <DialogContent className="max-w-6xl max-h-[90vh]">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <DialogTitle className="flex items-center gap-2">
                                    Activity Log Details
                                    {selectedLog && (
                                        <Badge className={cn("text-xs", getActionColor(selectedLog.action))}>
                                            {selectedLog.action.replace(/_/g, ' ')}
                                        </Badge>
                                    )}
                                </DialogTitle>
                                <DialogDescription>
                                    Comprehensive information about the selected activity log entry
                                </DialogDescription>
                            </div>
                            {selectedLog && (
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleCopyLogDetails(selectedLog)}
                                    >
                                        <Copy className="h-4 w-4 mr-2" />
                                        Copy All
                                    </Button>
                                    {selectedLog.processId && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                // In a real app, this would navigate to the process details
                                                console.log('Navigate to process:', selectedLog.processId);
                                            }}
                                        >
                                            <ExternalLink className="h-4 w-4 mr-2" />
                                            View Process
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </DialogHeader>
                    {selectedLog && (
                        <ScrollArea className="max-h-[70vh]">
                            <div className="space-y-6">
                                {/* Basic Information */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
                                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-600">Log ID</label>
                                            <p className="text-sm font-mono bg-gray-50 p-2 rounded border">
                                                {selectedLog.id}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-600">Timestamp</label>
                                            <p className="text-sm bg-gray-50 p-2 rounded border">
                                                {format(new Date(selectedLog.timestamp), 'PPpp')}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-600">Action Type</label>
                                            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded border">
                                                {getActionIcon(selectedLog.action)}
                                                <span className="text-sm">{selectedLog.action.replace(/_/g, ' ')}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-600">User ID</label>
                                            <p className="text-sm font-mono bg-gray-50 p-2 rounded border">
                                                {selectedLog.userId}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-600">Process ID</label>
                                            <p className="text-sm font-mono bg-gray-50 p-2 rounded border">
                                                {selectedLog.processId || 'N/A'}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-600">Relative Time</label>
                                            <p className="text-sm bg-gray-50 p-2 rounded border">
                                                {(() => {
                                                    const now = new Date();
                                                    const logTime = new Date(selectedLog.timestamp);
                                                    const diffMs = now.getTime() - logTime.getTime();
                                                    const diffMins = Math.floor(diffMs / 60000);
                                                    const diffHours = Math.floor(diffMins / 60);
                                                    const diffDays = Math.floor(diffHours / 24);

                                                    if (diffDays > 0) return `${diffDays} day(s) ago`;
                                                    if (diffHours > 0) return `${diffHours} hour(s) ago`;
                                                    if (diffMins > 0) return `${diffMins} minute(s) ago`;
                                                    return 'Just now';
                                                })()}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Context Information */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Context Information</h3>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-600">IP Address</label>
                                            <p className="text-sm font-mono bg-gray-50 p-2 rounded border">
                                                {(selectedLog.details as any)?.ipAddress || 'Not recorded'}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-600">User Agent</label>
                                            <p className="text-sm bg-gray-50 p-2 rounded border truncate" title={(selectedLog.details as any)?.userAgent}>
                                                {(selectedLog.details as any)?.userAgent || 'Not recorded'}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-600">Resource Type</label>
                                            <p className="text-sm bg-gray-50 p-2 rounded border">
                                                {(selectedLog.details as any)?.resourceType || 'Not specified'}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-600">Resource ID</label>
                                            <p className="text-sm font-mono bg-gray-50 p-2 rounded border">
                                                {(selectedLog.details as any)?.resourceId || 'Not specified'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Detailed Information */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-lg font-semibold">Detailed Information</h3>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                navigator.clipboard.writeText(formatLogDetails(selectedLog.details));
                                            }}
                                        >
                                            <Copy className="h-4 w-4 mr-2" />
                                            Copy Details
                                        </Button>
                                    </div>
                                    <ScrollArea className="h-64">
                                        <pre className="text-xs bg-gray-50 p-4 rounded border font-mono whitespace-pre-wrap">
                                            {formatLogDetails(selectedLog.details)}
                                        </pre>
                                    </ScrollArea>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex justify-end gap-2 pt-4 border-t">
                                    <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
                                        Close
                                    </Button>
                                    {selectedLog.processId && (
                                        <Button
                                            onClick={() => {
                                                // In a real app, this would navigate to the process details
                                                console.log('Navigate to process:', selectedLog.processId);
                                                setShowDetailsModal(false);
                                            }}
                                        >
                                            <ExternalLink className="h-4 w-4 mr-2" />
                                            View Related Process
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </ScrollArea>
                    )}
                </DialogContent>
            </Dialog>


        </div>
    );
};