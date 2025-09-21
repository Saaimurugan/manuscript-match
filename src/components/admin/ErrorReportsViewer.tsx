/**
 * Error Reports Viewer Component
 * Displays all stored error reports in a user-friendly interface for admin review
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    AlertTriangle,
    Bug,
    Calendar,
    Clock,
    Download,
    Eye,
    Filter,
    RefreshCw,
    Search,
    Trash2,
    User,
    Globe,
    Smartphone,
    Monitor
} from 'lucide-react';
import { errorReportService } from '@/services/errorReportService';
import { errorLogger } from '@/services/errorLogger';
import type { ErrorReportData } from '@/services/errorReportService';

interface ErrorReport extends ErrorReportData {
    id: string;
    reportedAt: string;
    status: 'new' | 'reviewed' | 'resolved' | 'ignored';
    reviewedBy?: string;
    reviewedAt?: string;
    notes?: string;
}

interface ErrorReportsViewerProps {
    className?: string;
}

export const ErrorReportsViewer: React.FC<ErrorReportsViewerProps> = ({ className }) => {
    const [reports, setReports] = useState<ErrorReport[]>([]);
    const [filteredReports, setFilteredReports] = useState<ErrorReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState<ErrorReport | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterSeverity, setFilterSeverity] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [showDetails, setShowDetails] = useState(false);

    // Load error reports on component mount
    useEffect(() => {
        loadErrorReports();
    }, []);

    // Filter reports when filters change
    useEffect(() => {
        filterReports();
    }, [reports, filterStatus, filterSeverity, searchTerm]);

    const loadErrorReports = async () => {
        try {
            setLoading(true);

            // Get reports from localStorage (pending and failed reports)
            const pendingReports = errorReportService.getPendingReports();
            const failedReports = getFailedReports();
            const logEntries = getLoggedErrors();

            // Combine all error sources
            const allReports: ErrorReport[] = [
                ...pendingReports.map(report => ({
                    ...report,
                    id: report.errorId,
                    reportedAt: report.timestamp,
                    status: 'new' as const
                })),
                ...failedReports.map(report => ({
                    ...report,
                    id: report.errorId,
                    reportedAt: report.timestamp,
                    status: 'new' as const
                })),
                ...logEntries.map(entry => ({
                    errorId: entry.id,
                    message: entry.message,
                    timestamp: entry.timestamp,
                    severity: entry.level === 'CRITICAL' ? 'critical' as const :
                        entry.level === 'ERROR' ? 'high' as const :
                            entry.level === 'WARN' ? 'medium' as const : 'low' as const,
                    category: 'runtime' as const,
                    url: entry.context?.url || 'unknown',
                    userAgent: entry.context?.userAgent || 'unknown',
                    userId: entry.context?.userId,
                    sessionId: entry.context?.sessionId || 'unknown',
                    id: entry.id,
                    reportedAt: entry.timestamp,
                    status: 'new' as const
                }))
            ];

            // Sort by most recent first
            allReports.sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());

            setReports(allReports);
        } catch (error) {
            console.error('Failed to load error reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const getFailedReports = (): ErrorReportData[] => {
        try {
            const stored = localStorage.getItem('errorReports_failed');
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    };

    const getLoggedErrors = () => {
        try {
            const stored = localStorage.getItem('errorLogger_entries');
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    };

    const filterReports = () => {
        let filtered = [...reports];

        // Filter by status
        if (filterStatus !== 'all') {
            filtered = filtered.filter(report => report.status === filterStatus);
        }

        // Filter by severity
        if (filterSeverity !== 'all') {
            filtered = filtered.filter(report => report.severity === filterSeverity);
        }

        // Filter by search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(report =>
                report.message.toLowerCase().includes(term) ||
                report.errorId.toLowerCase().includes(term) ||
                report.category.toLowerCase().includes(term) ||
                (report.userId && report.userId.toLowerCase().includes(term))
            );
        }

        setFilteredReports(filtered);
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'bg-red-100 text-red-800 border-red-200';
            case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'new': return 'bg-blue-100 text-blue-800';
            case 'reviewed': return 'bg-yellow-100 text-yellow-800';
            case 'resolved': return 'bg-green-100 text-green-800';
            case 'ignored': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleString();
        } catch {
            return dateString;
        }
    };

    const exportReports = () => {
        const dataStr = JSON.stringify(filteredReports, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `error-reports-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const clearAllReports = () => {
        if (window.confirm('Are you sure you want to clear all error reports? This action cannot be undone.')) {
            localStorage.removeItem('errorReports_pending');
            localStorage.removeItem('errorReports_failed');
            localStorage.removeItem('errorLogger_entries');
            setReports([]);
            setFilteredReports([]);
        }
    };

    const viewReportDetails = (report: ErrorReport) => {
        setSelectedReport(report);
        setShowDetails(true);
    };

    const closeDetails = () => {
        setShowDetails(false);
        setSelectedReport(null);
    };

    const getDeviceIcon = (userAgent: string) => {
        if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
            return <Smartphone className="w-4 h-4" />;
        }
        return <Monitor className="w-4 h-4" />;
    };

    if (loading) {
        return (
            <Card className={className}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bug className="w-5 h-5" />
                        Error Reports
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                        Loading error reports...
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className={className}>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Bug className="w-5 h-5" />
                                Error Reports
                            </CardTitle>
                            <CardDescription>
                                View and manage application error reports ({filteredReports.length} of {reports.length} reports)
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={loadErrorReports} variant="outline" size="sm">
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Refresh
                            </Button>
                            <Button onClick={exportReports} variant="outline" size="sm">
                                <Download className="w-4 h-4 mr-2" />
                                Export
                            </Button>
                            <Button onClick={clearAllReports} variant="destructive" size="sm">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Clear All
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Filters */}
                    <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                            <Search className="w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search reports..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="px-3 py-1 border rounded text-sm"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-gray-500" />
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="px-3 py-1 border rounded text-sm"
                            >
                                <option value="all">All Status</option>
                                <option value="new">New</option>
                                <option value="reviewed">Reviewed</option>
                                <option value="resolved">Resolved</option>
                                <option value="ignored">Ignored</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-gray-500" />
                            <select
                                value={filterSeverity}
                                onChange={(e) => setFilterSeverity(e.target.value)}
                                className="px-3 py-1 border rounded text-sm"
                            >
                                <option value="all">All Severity</option>
                                <option value="critical">Critical</option>
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                            </select>
                        </div>
                    </div>

                    {/* Reports List */}
                    {filteredReports.length === 0 ? (
                        <Alert>
                            <AlertTriangle className="w-4 h-4" />
                            <AlertDescription>
                                {reports.length === 0
                                    ? "No error reports found. This is good news!"
                                    : "No reports match the current filters."
                                }
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="space-y-4">
                            {filteredReports.map((report) => (
                                <Card key={report.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge className={getSeverityColor(report.severity)}>
                                                        {report.severity}
                                                    </Badge>
                                                    <Badge className={getStatusColor(report.status)}>
                                                        {report.status}
                                                    </Badge>
                                                    <span className="text-sm text-gray-500">
                                                        {report.category}
                                                    </span>
                                                </div>

                                                <h4 className="font-medium text-gray-900 mb-1">
                                                    {report.message}
                                                </h4>

                                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {formatDate(report.reportedAt)}
                                                    </div>

                                                    <div className="flex items-center gap-1">
                                                        <Bug className="w-3 h-3" />
                                                        {report.errorId.substring(0, 8)}...
                                                    </div>

                                                    {report.userId && (
                                                        <div className="flex items-center gap-1">
                                                            <User className="w-3 h-3" />
                                                            {report.userId.substring(0, 8)}...
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-1">
                                                        {getDeviceIcon(report.userAgent)}
                                                        <Globe className="w-3 h-3" />
                                                    </div>
                                                </div>
                                            </div>

                                            <Button
                                                onClick={() => viewReportDetails(report)}
                                                variant="outline"
                                                size="sm"
                                            >
                                                <Eye className="w-4 h-4 mr-2" />
                                                View Details
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Report Details Modal */}
            {showDetails && selectedReport && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h3 className="text-lg font-semibold">Error Report Details</h3>
                            <Button onClick={closeDetails} variant="ghost" size="sm">
                                ×
                            </Button>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                            <Tabs defaultValue="overview" className="w-full">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="overview">Overview</TabsTrigger>
                                    <TabsTrigger value="technical">Technical Details</TabsTrigger>
                                    <TabsTrigger value="context">Context</TabsTrigger>
                                </TabsList>

                                <TabsContent value="overview" className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Error ID</label>
                                            <p className="text-sm bg-gray-100 p-2 rounded font-mono">{selectedReport.errorId}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Reported At</label>
                                            <p className="text-sm bg-gray-100 p-2 rounded">{formatDate(selectedReport.reportedAt)}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Severity</label>
                                            <Badge className={getSeverityColor(selectedReport.severity)}>
                                                {selectedReport.severity}
                                            </Badge>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Category</label>
                                            <p className="text-sm bg-gray-100 p-2 rounded">{selectedReport.category}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Error Message</label>
                                        <p className="text-sm bg-gray-100 p-3 rounded">{selectedReport.message}</p>
                                    </div>

                                    {selectedReport.userDescription && (
                                        <div>
                                            <label className="block text-sm font-medium mb-1">User Description</label>
                                            <p className="text-sm bg-blue-50 p-3 rounded border border-blue-200">
                                                {selectedReport.userDescription}
                                            </p>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="technical" className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Stack Trace</label>
                                        <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto max-h-40">
                                            {selectedReport.stack || 'No stack trace available'}
                                        </pre>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Component Stack</label>
                                        <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto max-h-32">
                                            {selectedReport.componentStack || 'No component stack available'}
                                        </pre>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">URL</label>
                                            <p className="text-sm bg-gray-100 p-2 rounded break-all">{selectedReport.url}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Session ID</label>
                                            <p className="text-sm bg-gray-100 p-2 rounded font-mono">{selectedReport.sessionId}</p>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="context" className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">User Agent</label>
                                        <p className="text-sm bg-gray-100 p-2 rounded break-all">{selectedReport.userAgent}</p>
                                    </div>

                                    {selectedReport.userId && (
                                        <div>
                                            <label className="block text-sm font-medium mb-1">User ID</label>
                                            <p className="text-sm bg-gray-100 p-2 rounded font-mono">{selectedReport.userId}</p>
                                        </div>
                                    )}

                                    {selectedReport.additionalContext && (
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Additional Context</label>
                                            <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto max-h-40">
                                                {JSON.stringify(selectedReport.additionalContext, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ErrorReportsViewer;