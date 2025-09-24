import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
    Workflow,
    Search,
    Filter,
    Plus,
    Edit,
    Trash2,
    RotateCcw,
    Play,
    Pause,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Clock,
    Users,
    MoreHorizontal,
    Download,
    RefreshCw,
    Eye,
    Settings,
    FileText
} from "lucide-react";
import { format } from "date-fns";
import {
    useAdminProcesses,
    useDeleteAdminProcess,
    useCreateAdminProcess,
    useUpdateAdminProcess,
    useResetProcessStage,
    useProcessTemplates
} from "@/hooks/useAdmin";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Form validation schemas
const createProcessSchema = z.object({
    title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
    description: z.string().min(1, 'Description is required').max(500, 'Description must be less than 500 characters'),
    templateId: z.string().optional(),
    userId: z.string().optional(),
});

const editProcessSchema = z.object({
    title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
    description: z.string().min(1, 'Description is required').max(500, 'Description must be less than 500 characters'),
    status: z.enum(['CREATED', 'UPLOADING', 'PROCESSING', 'SEARCHING', 'VALIDATING', 'COMPLETED', 'ERROR']).optional(),
});

const resetStageSchema = z.object({
    targetStep: z.enum(['UPLOAD', 'METADATA_EXTRACTION', 'KEYWORD_ENHANCEMENT', 'DATABASE_SEARCH', 'MANUAL_SEARCH', 'VALIDATION', 'RECOMMENDATIONS', 'SHORTLIST', 'EXPORT']),
    reason: z.string().optional(),
});

type CreateProcessFormData = z.infer<typeof createProcessSchema>;
type EditProcessFormData = z.infer<typeof editProcessSchema>;
type ResetStageFormData = z.infer<typeof resetStageSchema>;

interface ProcessManagementProps {
    className?: string;
}

export const ProcessManagement: React.FC<ProcessManagementProps> = ({ className }) => {
    const { toast } = useToast();

    // State management
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [userFilter, setUserFilter] = useState<string>("all");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [selectedProcess, setSelectedProcess] = useState<any>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    // Forms
    const createForm = useForm<CreateProcessFormData>({
        resolver: zodResolver(createProcessSchema),
        defaultValues: {
            title: "",
            description: "",
            templateId: "",
            userId: "",
        },
    });

    const editForm = useForm<EditProcessFormData>({
        resolver: zodResolver(editProcessSchema),
        defaultValues: {
            title: "",
            description: "",
            status: undefined,
        },
    });

    const resetForm = useForm<ResetStageFormData>({
        resolver: zodResolver(resetStageSchema),
        defaultValues: {
            targetStep: 'UPLOAD',
            reason: "",
        },
    });

    // Fetch data
    const {
        data: processesData,
        isLoading: processesLoading,
        error: processesError,
        refetch: refetchProcesses
    } = useAdminProcesses({
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        userId: userFilter !== "all" ? userFilter : undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc'
    });

    const {
        data: templates,
        isLoading: templatesLoading,
        error: templatesError
    } = useProcessTemplates();

    // Mutations
    const deleteProcessMutation = useDeleteAdminProcess();
    const createProcessMutation = useCreateAdminProcess();
    const updateProcessMutation = useUpdateAdminProcess();
    const resetStageMutation = useResetProcessStage();

    const processes = processesData?.data || [];
    const pagination = processesData?.pagination;



    const handleSearch = (value: string) => {
        setSearchTerm(value);
        setCurrentPage(1);
    };

    const handleStatusFilter = (value: string) => {
        setStatusFilter(value);
        setCurrentPage(1);
    };

    const handleUserFilter = (value: string) => {
        setUserFilter(value);
        setCurrentPage(1);
    };

    const handleCreateProcess = async (data: CreateProcessFormData) => {
        try {
            await createProcessMutation.mutateAsync({
                title: data.title,
                description: data.description,
                templateId: data.templateId || undefined,
                userId: data.userId || undefined,
            });

            toast({
                title: 'Process created',
                description: `"${data.title}" has been created successfully.`,
            });

            createForm.reset();
            setShowCreateModal(false);
            refetchProcesses();
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to create process. Please try again.',
                variant: 'destructive',
            });
        }
    };

    const handleEditProcess = (process: any) => {
        setSelectedProcess(process);
        editForm.reset({
            title: process.title,
            description: process.description,
            status: process.status,
        });
        setShowEditModal(true);
    };

    const handleUpdateProcess = async (data: EditProcessFormData) => {
        if (!selectedProcess) return;

        try {
            await updateProcessMutation.mutateAsync({
                processId: selectedProcess.id,
                data: {
                    title: data.title,
                    description: data.description,
                    status: data.status,
                },
            });

            toast({
                title: 'Process updated',
                description: `"${data.title}" has been updated successfully.`,
            });

            setShowEditModal(false);
            setSelectedProcess(null);
            refetchProcesses();
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to update process. Please try again.',
                variant: 'destructive',
            });
        }
    };

    const handleDeleteProcess = async (processId: string) => {
        if (window.confirm('Are you sure you want to delete this process? This action cannot be undone.')) {
            try {
                await deleteProcessMutation.mutateAsync(processId);
                refetchProcesses();
            } catch (error) {
                console.error('Failed to delete process:', error);
            }
        }
    };

    const handleResetStage = (process: any) => {
        setSelectedProcess(process);
        resetForm.reset({
            targetStep: 'UPLOAD',
            reason: "",
        });
        setShowResetModal(true);
    };

    const handleConfirmReset = async (data: ResetStageFormData) => {
        if (!selectedProcess) return;

        try {
            await resetStageMutation.mutateAsync({
                processId: selectedProcess.id,
                data: {
                    targetStep: data.targetStep,
                    reason: data.reason,
                },
            });

            toast({
                title: 'Stage reset',
                description: `Process stage has been reset to ${data.targetStep.replace('_', ' ')}.`,
            });

            setShowResetModal(false);
            setSelectedProcess(null);
            refetchProcesses();
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to reset process stage. Please try again.',
                variant: 'destructive',
            });
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return 'text-green-600 bg-green-50 border-green-200';
            case 'IN_PROGRESS':
                return 'text-blue-600 bg-blue-50 border-blue-200';
            case 'FAILED':
                return 'text-red-600 bg-red-50 border-red-200';
            case 'PAUSED':
                return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            default:
                return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const getStepProgress = (currentStep: string) => {
        const steps = ['UPLOAD', 'METADATA_EXTRACTION', 'KEYWORD_ENHANCEMENT', 'DATABASE_SEARCH', 'MANUAL_SEARCH', 'VALIDATION', 'RECOMMENDATIONS', 'SHORTLIST', 'EXPORT'];
        const currentIndex = steps.indexOf(currentStep);
        return currentIndex >= 0 ? ((currentIndex + 1) / steps.length) * 100 : 0;
    };

    if (processesError) {
        return (
            <Card className={className}>
                <CardContent className="py-8">
                    <Alert>
                        <AlertDescription>
                            Failed to load processes. Please try refreshing the page.
                        </AlertDescription>
                    </Alert>
                    <Button variant="outline" onClick={() => refetchProcesses()} className="mt-4">
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
                                <Workflow className="h-5 w-5" />
                                Process Management
                            </CardTitle>
                            <CardDescription>
                                Manage system processes, workflows, and templates
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => refetchProcesses()}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Refresh
                            </Button>
                            <Button size="sm" onClick={() => setShowCreateModal(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Process
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Filters and Search */}
            <Card>
                <CardContent className="py-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search processes by title or description..."
                                    value={searchTerm}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Select value={statusFilter} onValueChange={handleStatusFilter}>
                                <SelectTrigger className="w-40">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="CREATED">Created</SelectItem>
                                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                    <SelectItem value="COMPLETED">Completed</SelectItem>
                                    <SelectItem value="FAILED">Failed</SelectItem>
                                    <SelectItem value="PAUSED">Paused</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={userFilter} onValueChange={handleUserFilter}>
                                <SelectTrigger className="w-40">
                                    <SelectValue placeholder="User" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Users</SelectItem>
                                    <SelectItem value="user1">user@example.com</SelectItem>
                                    <SelectItem value="user2">admin@example.com</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Process Statistics */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Processes</p>
                                <p className="text-2xl font-bold">{pagination?.total || 0}</p>
                            </div>
                            <Workflow className="h-8 w-8 text-blue-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Active</p>
                                <p className="text-2xl font-bold text-blue-600">
                                    {processes.filter(p => p.status === 'IN_PROGRESS').length}
                                </p>
                            </div>
                            <Play className="h-8 w-8 text-blue-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Completed</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {processes.filter(p => p.status === 'COMPLETED').length}
                                </p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Failed</p>
                                <p className="text-2xl font-bold text-red-600">
                                    {processes.filter(p => p.status === 'FAILED').length}
                                </p>
                            </div>
                            <XCircle className="h-8 w-8 text-red-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Processes Table */}
            <Card>
                <CardContent className="p-0">
                    {processesLoading ? (
                        <div className="p-6 space-y-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex items-center space-x-4">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-4 w-48" />
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                            ))}
                        </div>
                    ) : processes.length > 0 ? (
                        <ScrollArea className="h-[600px]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Process</TableHead>
                                        <TableHead>User</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Progress</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead>Updated</TableHead>
                                        <TableHead className="w-12">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {processes.map((process) => (
                                        <TableRow key={process.id}>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{process.title}</div>
                                                    <div className="text-sm text-gray-500 truncate max-w-xs">
                                                        {process.description}
                                                    </div>
                                                    <div className="text-xs text-gray-400 mt-1">
                                                        ID: {process.id.slice(0, 8)}...
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Users className="h-4 w-4 text-gray-400" />
                                                    <span className="text-sm">{process.userEmail}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={cn("text-xs", getStatusColor(process.status))}>
                                                    {process.status.replace('_', ' ')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <Progress
                                                            value={getStepProgress(process.currentStep)}
                                                            className="w-20 h-2"
                                                        />
                                                        <span className="text-xs text-gray-500">
                                                            {Math.round(getStepProgress(process.currentStep))}%
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {process.currentStep.replace('_', ' ')}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-500">
                                                {format(new Date(process.createdAt), 'MMM dd, yyyy')}
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-500">
                                                {format(new Date(process.updatedAt), 'MMM dd, HH:mm')}
                                            </TableCell>
                                            <TableCell>
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="ghost" size="sm">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>Process Actions</DialogTitle>
                                                            <DialogDescription>
                                                                Choose an action for "{process.title}"
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="space-y-2">
                                                            <Button
                                                                variant="outline"
                                                                className="w-full justify-start"
                                                                onClick={() => handleEditProcess(process)}
                                                            >
                                                                <Edit className="h-4 w-4 mr-2" />
                                                                Edit Process
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                className="w-full justify-start"
                                                                onClick={() => handleResetStage(process)}
                                                            >
                                                                <RotateCcw className="h-4 w-4 mr-2" />
                                                                Reset Stage
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                className="w-full justify-start"
                                                            >
                                                                <Eye className="h-4 w-4 mr-2" />
                                                                View Details
                                                            </Button>
                                                            <Button
                                                                variant="destructive"
                                                                className="w-full justify-start"
                                                                onClick={() => handleDeleteProcess(process.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-2" />
                                                                Delete Process
                                                            </Button>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    ) : (
                        <div className="p-8 text-center">
                            <Workflow className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">No processes found</p>
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
                                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, pagination.total)} of {pagination.total} processes
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                >
                                    Previous
                                </Button>
                                <span className="text-sm">
                                    Page {currentPage} of {pagination.totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                                    disabled={currentPage === pagination.totalPages}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Create Process Modal */}
            <Dialog open={showCreateModal} onOpenChange={(open) => {
                setShowCreateModal(open);
                if (!open) {
                    createForm.reset();
                }
            }}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5" />
                            Create New Process
                        </DialogTitle>
                        <DialogDescription>
                            Create a new process using a template or custom configuration
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...createForm}>
                        <form onSubmit={createForm.handleSubmit(handleCreateProcess)} className="space-y-4">
                            <FormField
                                control={createForm.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Process Title</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter process title" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={createForm.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Enter process description"
                                                className="resize-none"
                                                rows={3}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={createForm.control}
                                name="templateId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Template (Optional)</FormLabel>
                                        <FormControl>
                                            <Select value={field.value} onValueChange={field.onChange}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a template" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="">No template</SelectItem>
                                                    {templatesLoading ? (
                                                        <SelectItem value="" disabled>Loading templates...</SelectItem>
                                                    ) : templates?.map((template) => (
                                                        <SelectItem key={template.id} value={template.id}>
                                                            <div>
                                                                <div className="font-medium">{template.name}</div>
                                                                <div className="text-xs text-gray-500">{template.description}</div>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {createForm.watch('templateId') && templates && (
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <h4 className="font-medium mb-2 flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        Template Steps:
                                    </h4>
                                    <div className="flex flex-wrap gap-1">
                                        {templates.find(t => t.id === createForm.watch('templateId'))?.steps.map((step, index) => (
                                            <Badge key={index} variant="outline" className="text-xs">
                                                {step}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowCreateModal(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createProcessMutation.isPending}
                                >
                                    {createProcessMutation.isPending ? 'Creating...' : 'Create Process'}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Edit Process Modal */}
            <Dialog open={showEditModal} onOpenChange={(open) => {
                setShowEditModal(open);
                if (!open) {
                    setSelectedProcess(null);
                    editForm.reset();
                }
            }}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Edit className="h-5 w-5" />
                            Edit Process
                        </DialogTitle>
                        <DialogDescription>
                            Modify process details and configuration
                        </DialogDescription>
                    </DialogHeader>

                    {selectedProcess && (
                        <Form {...editForm}>
                            <form onSubmit={editForm.handleSubmit(handleUpdateProcess)} className="space-y-4">
                                <div className="p-3 bg-blue-50 rounded-lg">
                                    <div className="text-sm font-medium text-blue-900">Process Information</div>
                                    <div className="text-xs text-blue-700 mt-1">
                                        ID: {selectedProcess.id} • User: {selectedProcess.userEmail}
                                    </div>
                                </div>

                                <FormField
                                    control={editForm.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Process Title</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Enter process title" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={editForm.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Enter process description"
                                                    className="resize-none"
                                                    rows={3}
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={editForm.control}
                                    name="status"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Status</FormLabel>
                                            <FormControl>
                                                <Select value={field.value} onValueChange={field.onChange}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select status" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="CREATED">Created</SelectItem>
                                                        <SelectItem value="UPLOADING">Uploading</SelectItem>
                                                        <SelectItem value="PROCESSING">Processing</SelectItem>
                                                        <SelectItem value="SEARCHING">Searching</SelectItem>
                                                        <SelectItem value="VALIDATING">Validating</SelectItem>
                                                        <SelectItem value="COMPLETED">Completed</SelectItem>
                                                        <SelectItem value="ERROR">Error</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="flex justify-end gap-2 pt-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowEditModal(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={updateProcessMutation.isPending}
                                    >
                                        {updateProcessMutation.isPending ? 'Updating...' : 'Update Process'}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Reset Stage Modal */}
            <Dialog open={showResetModal} onOpenChange={(open) => {
                setShowResetModal(open);
                if (!open) {
                    setSelectedProcess(null);
                    resetForm.reset();
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <RotateCcw className="h-5 w-5" />
                            Reset Process Stage
                        </DialogTitle>
                        <DialogDescription>
                            Reset the process to a previous stage. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedProcess && (
                        <Form {...resetForm}>
                            <form onSubmit={resetForm.handleSubmit(handleConfirmReset)} className="space-y-4">
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <h4 className="font-medium">{selectedProcess.title}</h4>
                                    <p className="text-sm text-gray-600">
                                        Current Stage: {selectedProcess.currentStep.replace('_', ' ')}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        User: {selectedProcess.userEmail}
                                    </p>
                                </div>

                                <Alert>
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription>
                                        Resetting the process stage will lose all progress after the selected stage.
                                    </AlertDescription>
                                </Alert>

                                <FormField
                                    control={resetForm.control}
                                    name="targetStep"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Reset to Stage</FormLabel>
                                            <FormControl>
                                                <Select value={field.value} onValueChange={field.onChange}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select stage" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="UPLOAD">Upload</SelectItem>
                                                        <SelectItem value="METADATA_EXTRACTION">Metadata Extraction</SelectItem>
                                                        <SelectItem value="KEYWORD_ENHANCEMENT">Keyword Enhancement</SelectItem>
                                                        <SelectItem value="DATABASE_SEARCH">Database Search</SelectItem>
                                                        <SelectItem value="MANUAL_SEARCH">Manual Search</SelectItem>
                                                        <SelectItem value="VALIDATION">Validation</SelectItem>
                                                        <SelectItem value="RECOMMENDATIONS">Recommendations</SelectItem>
                                                        <SelectItem value="SHORTLIST">Shortlist</SelectItem>
                                                        <SelectItem value="EXPORT">Export</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={resetForm.control}
                                    name="reason"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Reason (Optional)</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Enter reason for stage reset..."
                                                    className="resize-none"
                                                    rows={2}
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="flex justify-end gap-2 pt-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowResetModal(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="destructive"
                                        disabled={resetStageMutation.isPending}
                                    >
                                        {resetStageMutation.isPending ? 'Resetting...' : 'Reset Stage'}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};