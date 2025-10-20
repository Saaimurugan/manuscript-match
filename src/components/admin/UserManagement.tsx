import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Users,
  UserPlus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Shield,
  UserX,
  Mail,
  Download,
  RefreshCw,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react";
import { format } from "date-fns";
import {
  useAdminUsers,
  useUpdateUserRole,
  useUpdateUserStatus,
  useDeleteUser,
  useInviteUser
} from "@/hooks/useAdmin";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { toast as sonnerToast } from "sonner";
import { cn } from "@/lib/utils";
import type { AdminUserDetails } from "@/services/adminService";
import { adminService } from "@/services/adminService";
import { apiService } from "@/services/apiService";
import type { PaginatedResponse } from "@/types/api";

interface UserManagementProps {
  className?: string;
}

type UserRole = "USER" | "QC" | "MANAGER" | "ADMIN";
type UserStatus = "ACTIVE" | "BLOCKED" | "INVITED" | "PENDING";

interface InviteUserData {
  email: string;
  role: UserRole;
}

interface EditUserData {
  email: string;
  role: UserRole;
  status: UserStatus;
}

interface UserDetailsModalData extends AdminUserDetails {
  // Additional fields for detailed view
}

export const UserManagement: React.FC<UserManagementProps> = ({ className }) => {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // Modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form data states
  const [inviteData, setInviteData] = useState<InviteUserData>({
    email: "",
    role: "USER"
  });
  const [editingUser, setEditingUser] = useState<AdminUserDetails | null>(null);
  const [editData, setEditData] = useState<EditUserData>({
    email: "",
    role: "USER",
    status: "ACTIVE"
  });
  const [userToDelete, setUserToDelete] = useState<AdminUserDetails | null>(null);
  const [detailsUser, setDetailsUser] = useState<AdminUserDetails | null>(null);

  // Form validation states
  const [inviteErrors, setInviteErrors] = useState<Record<string, string>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  // Fetch users with filters
  const queryParams = {
    page: currentPage,
    limit: pageSize,
    search: searchTerm || undefined,
    role: roleFilter !== "all" && (roleFilter === "USER" || roleFilter === "ADMIN")
      ? (roleFilter as "USER" | "ADMIN")
      : undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc' as const
  };

  console.log('UserManagement - Query params:', queryParams);
  console.log('UserManagement - Search term:', searchTerm);
  console.log('UserManagement - Role filter:', roleFilter);
  console.log('UserManagement - Status filter:', statusFilter);

  const {
    data: usersData,
    isLoading: usersLoading,
    error: usersError,
    refetch: refetchUsers
  } = useAdminUsers(queryParams);

  // Mutations
  const updateRoleMutation = useUpdateUserRole();
  const updateStatusMutation = useUpdateUserStatus();
  const deleteUserMutation = useDeleteUser();
  const inviteUserMutation = useInviteUser();

  // Mock users data when API fails - using actual UUIDs from database
  const mockUsers: AdminUserDetails[] = [
    {
      id: "5ad7e131-4a5f-455b-a7cc-18d4a3bbc99a", // user@test.com
      email: "user@test.com",
      role: "USER",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 7 days ago
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
      lastLoginAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
      processCount: 5,
      activityCount: 23
    },
    {
      id: "1aa37a5f-479f-4c00-b1a6-4a3db7449868", // admin@test.com
      email: "admin@test.com",
      role: "ADMIN",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(), // 30 days ago
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
      lastLoginAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
      processCount: 12,
      activityCount: 156
    },
    {
      id: "38d51725-082b-4b52-b397-bb6da737b490", // user2@test.com
      email: "user2@test.com", 
      role: "USER",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(), // 14 days ago
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 hours ago
      lastLoginAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
      processCount: 8,
      activityCount: 45
    }
  ];

  const users = (usersData as PaginatedResponse<AdminUserDetails>)?.data?.length > 0 
    ? (usersData as PaginatedResponse<AdminUserDetails>).data 
    : mockUsers;
    
  const pagination = (usersData as PaginatedResponse<AdminUserDetails>)?.pagination || {
    page: 1,
    limit: 50,
    total: mockUsers.length,
    totalPages: 1,
    hasNext: false,
    hasPrev: false
  };

  // Debug logging
  console.log('UserManagement - usersData:', usersData);
  console.log('UserManagement - users:', users);
  console.log('UserManagement - usersLoading:', usersLoading);
  console.log('UserManagement - usersError:', usersError);

  // Filter users by status (client-side filtering since API doesn't support status filter yet)
  const filteredUsers = useMemo(() => {
    if (statusFilter === "all") return users;
    return users.filter(user => {
      // Map API status to our filter values
      const userStatus = user.role === "ADMIN" ? "ACTIVE" : "ACTIVE"; // Simplified for now
      return userStatus.toLowerCase() === statusFilter.toLowerCase();
    });
  }, [users, statusFilter]);

  // Form validation functions
  const validateInviteForm = (data: InviteUserData): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!data.email) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = "Please enter a valid email address";
    }

    if (!data.role) {
      errors.role = "Role is required";
    }

    return errors;
  };

  const validateEditForm = (data: EditUserData): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!data.email) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = "Please enter a valid email address";
    }

    if (!data.role) {
      errors.role = "Role is required";
    }

    if (!data.status) {
      errors.status = "Status is required";
    }

    return errors;
  };

  // Event handlers
  const handleSearch = (value: string) => {
    console.log('Search triggered with value:', value);
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleRoleFilter = (value: string) => {
    console.log('Role filter changed to:', value);
    setRoleFilter(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (value: string) => {
    console.log('Status filter changed to:', value);
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(filteredUsers.map(user => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handlePromoteUser = async (userId: string, newRole: UserRole) => {
    const roleData: { userId: string; role: "USER" | "ADMIN" } = {
      userId: userId,
      role: newRole as "USER" | "ADMIN"
    };

    updateRoleMutation.mutate(roleData, {
      onSuccess: () => {
        refetchUsers();
      }
    });
  };

  const handleBlockUser = async (userId: string, block: boolean) => {
    const statusData: { userId: string; status: 'active' | 'suspended' } = {
      userId: userId,
      status: block ? 'suspended' : 'active'
    };
    updateStatusMutation.mutate(statusData, {
      onSuccess: () => {
        refetchUsers();
      }
    });
  };

  const handleDeleteUser = async (userId: string) => {
    deleteUserMutation.mutate(userId, {
      onSuccess: () => {
        refetchUsers();
        setShowDeleteConfirm(false);
        setUserToDelete(null);
      },
      onError: () => {
        setShowDeleteConfirm(false);
        setUserToDelete(null);
      }
    });
  };

  const handleEditUser = (user: AdminUserDetails) => {
    setEditingUser(user);
    setEditData({
      email: user.email,
      role: user.role as UserRole,
      status: "ACTIVE" // Default status
    });
    setEditErrors({});
    setShowEditModal(true);
  };

  const handleViewUserDetails = (user: AdminUserDetails) => {
    setDetailsUser(user);
    setShowDetailsModal(true);
  };

  const handleInviteUser = async () => {
    const errors = validateInviteForm(inviteData);
    setInviteErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    inviteUserMutation.mutate({
      email: inviteData.email,
      role: inviteData.role as 'USER' | 'ADMIN'
    }, {
      onSuccess: () => {
        // Reset form and close modal on success
        setInviteData({ email: "", role: "USER" });
        setInviteErrors({});
        setShowInviteModal(false);
        refetchUsers();
      }
    });
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    const errors = validateEditForm(editData);
    setEditErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    // Update role if changed
    if (editData.role !== editingUser.role) {
      const roleData: { userId: string; role: "USER" | "ADMIN" } = {
        userId: editingUser.id,
        role: editData.role as "USER" | "ADMIN"
      };
      updateRoleMutation.mutate(roleData, {
        onSuccess: () => {
          refetchUsers();
          // Reset form and close modal
          setEditingUser(null);
          setEditData({ email: "", role: "USER", status: "ACTIVE" });
          setEditErrors({});
          setShowEditModal(false);
        }
      });
    } else {
      // No changes made, just close modal
      setEditingUser(null);
      setEditData({ email: "", role: "USER", status: "ACTIVE" });
      setEditErrors({});
      setShowEditModal(false);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedUsers.length === 0) return;

    // Check for mixed selection
    const selectedUserDetails = selectedUsers.map(userId => 
      filteredUsers.find(u => u.id === userId)
    ).filter(Boolean);
    
    const hasAdminUsers = selectedUserDetails.some(user => user.role === 'ADMIN');
    const hasNonAdminUsers = selectedUserDetails.some(user => user.role !== 'ADMIN');
    const hasMixedSelection = hasAdminUsers && hasNonAdminUsers;

    if (hasMixedSelection && (action === 'promote' || action === 'block' || action === 'delete')) {
      sonnerToast.warning("Please select either all admin or all non-admin users for bulk actions");
      return;
    }

    switch (action) {
      case 'promote':
        // Bulk promote users to admin (only non-admin users)
        const usersToPromote = selectedUsers.filter(userId => {
          const user = filteredUsers.find(u => u.id === userId);
          return user && user.role !== 'ADMIN';
        });
        
        if (usersToPromote.length === 0) {
          sonnerToast.warning("No users to promote - selected users are already admins");
          return;
        }
        
        for (const userId of usersToPromote) {
          const roleData: { userId: string; role: "USER" | "ADMIN" } = {
            userId: userId,
            role: 'ADMIN'
          };
          updateRoleMutation.mutate(roleData);
        }
        setSelectedUsers([]);
        refetchUsers();
        break;
      case 'block':
        // Bulk block users (exclude current user and admin users)
        const usersToBlock = selectedUsers.filter(userId => {
          const user = filteredUsers.find(u => u.id === userId);
          return user && user.id !== currentUser?.id && user.role !== 'ADMIN';
        });
        
        if (usersToBlock.length === 0) {
          sonnerToast.warning("No users to block - cannot block yourself or admin users");
          return;
        }
        
        for (const userId of usersToBlock) {
          const statusData: { userId: string; status: 'active' | 'suspended' } = {
            userId: userId,
            status: 'suspended'
          };
          updateStatusMutation.mutate(statusData);
        }
        setSelectedUsers([]);
        refetchUsers();
        break;
      case 'delete':
        // Bulk delete users (exclude current user and admin users)
        const usersToDelete = selectedUsers.filter(userId => {
          const user = filteredUsers.find(u => u.id === userId);
          return user && user.id !== currentUser?.id && user.role !== 'ADMIN';
        });
        
        if (usersToDelete.length === 0) {
          sonnerToast.warning("No users to delete - cannot delete yourself or admin users");
          return;
        }
        
        if (window.confirm(`Are you sure you want to delete ${usersToDelete.length} users? This action cannot be undone.`)) {
          for (const userId of usersToDelete) {
            deleteUserMutation.mutate(userId);
          }
          setSelectedUsers([]);
          refetchUsers();
        }
        break;
      case 'export':
        // Export selected users
        try {
          await adminService.exportUsers(selectedUsers, 'csv');
          sonnerToast.success(`Exported ${selectedUsers.length} users`);
        } catch (error) {
          sonnerToast.error("Failed to export users");
        }
        break;
    }
  };

  const handleConfirmDelete = (user: AdminUserDetails) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'default';
      case 'MANAGER': return 'secondary';
      case 'QC': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'default';
      case 'blocked': return 'destructive';
      case 'invited': return 'secondary';
      case 'pending': return 'outline';
      default: return 'outline';
    }
  };

  if (usersError) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <Alert>
            <AlertDescription>
              Failed to load users. Please try refreshing the page.
            </AlertDescription>
          </Alert>
          <Button variant="outline" onClick={() => refetchUsers()} className="mt-4">
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
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage users, roles, and permissions
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetchUsers()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button size="sm" onClick={() => setShowInviteModal(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite User
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
                  placeholder="Search users by email or name..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={roleFilter} onValueChange={handleRoleFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="QC">QC</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={handleStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="invited">Invited</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedUsers.length > 0 && (() => {
            // Get selected user details
            const selectedUserDetails = selectedUsers.map(userId => 
              filteredUsers.find(u => u.id === userId)
            ).filter(Boolean);
            
            // Check if selection contains both admin and non-admin users
            const hasAdminUsers = selectedUserDetails.some(user => user.role === 'ADMIN');
            const hasNonAdminUsers = selectedUserDetails.some(user => user.role !== 'ADMIN');
            const hasMixedSelection = hasAdminUsers && hasNonAdminUsers;
            
            // Check if current user is selected
            const hasCurrentUser = selectedUsers.includes(currentUser?.id || '');
            
            // Calculate eligible users for each action
            const usersToPromote = selectedUsers.filter(userId => {
              const user = filteredUsers.find(u => u.id === userId);
              return user && user.role !== 'ADMIN';
            });
            
            const usersToBlock = selectedUsers.filter(userId => {
              const user = filteredUsers.find(u => u.id === userId);
              return user && user.id !== currentUser?.id && user.role !== 'ADMIN';
            });
            
            const usersToDelete = selectedUsers.filter(userId => {
              const user = filteredUsers.find(u => u.id === userId);
              return user && user.id !== currentUser?.id && user.role !== 'ADMIN';
            });

            // Determine if actions should be disabled due to mixed selection
            const promoteDisabled = hasMixedSelection || usersToPromote.length === 0;
            const blockDisabled = hasMixedSelection || usersToBlock.length === 0;
            const deleteDisabled = hasMixedSelection || usersToDelete.length === 0;

            return (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-blue-900">
                      {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
                    </span>
                    {hasMixedSelection && (
                      <span className="text-xs text-amber-700 mt-1">
                        ⚠️ Mixed selection: Please select either all admin or all non-admin users for bulk actions
                      </span>
                    )}
                    {!hasMixedSelection && (hasCurrentUser || hasAdminUsers) && (
                      <span className="text-xs text-blue-700 mt-1">
                        Note: Admin users and yourself are protected from certain actions
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleBulkAction('promote')}
                      disabled={promoteDisabled}
                      title={
                        hasMixedSelection 
                          ? "Cannot promote mixed selection of admin and non-admin users" 
                          : usersToPromote.length === 0 
                            ? "No users to promote" 
                            : `Promote ${usersToPromote.length} user(s) to admin`
                      }
                    >
                      <Shield className="h-4 w-4 mr-1" />
                      Promote
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleBulkAction('block')}
                      disabled={blockDisabled}
                      title={
                        hasMixedSelection 
                          ? "Cannot block mixed selection of admin and non-admin users" 
                          : usersToBlock.length === 0 
                            ? "No users to block" 
                            : `Block ${usersToBlock.length} user(s)`
                      }
                    >
                      <UserX className="h-4 w-4 mr-1" />
                      Block
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleBulkAction('delete')}
                      disabled={deleteDisabled}
                      title={
                        hasMixedSelection 
                          ? "Cannot delete mixed selection of admin and non-admin users" 
                          : usersToDelete.length === 0 
                            ? "No users to delete" 
                            : `Delete ${usersToDelete.length} user(s)`
                      }
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleBulkAction('export')}>
                      <Download className="h-4 w-4 mr-1" />
                      Export
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {usersLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : filteredUsers.length > 0 ? (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>

                    <TableHead>Joined</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="w-12">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <Mail className="h-4 w-4 text-gray-600" />
                          </div>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {user.email}
                              {user.id === currentUser?.id && (
                                <Badge variant="secondary" className="text-xs">
                                  You
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">ID: {user.id.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant("active")} className="text-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      </TableCell>

                      <TableCell className="text-sm text-gray-500">
                        {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {user.lastLoginAt ? format(new Date(user.lastLoginAt), 'MMM dd, HH:mm') : 'Never'}
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
                              <DialogTitle>User Actions</DialogTitle>
                              <DialogDescription>
                                Choose an action for {user.email}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-2">
                              <Button
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() => handleViewUserDetails(user)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Button>
                              <Button
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() => handleEditUser(user)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit User
                              </Button>

                              {/* Role Management - Show appropriate action based on current role */}
                              {user.id === currentUser?.id ? (
                                <Button
                                  variant="outline"
                                  className="w-full justify-start opacity-50"
                                  disabled={true}
                                  title="Cannot change your own role"
                                >
                                  <Shield className="h-4 w-4 mr-2" />
                                  Cannot Change Own Role
                                </Button>
                              ) : user.role === 'ADMIN' ? (
                                <Button
                                  variant="outline"
                                  className="w-full justify-start"
                                  onClick={() => handlePromoteUser(user.id, 'USER')}
                                  disabled={updateRoleMutation.isPending}
                                >
                                  <Shield className="h-4 w-4 mr-2" />
                                  {updateRoleMutation.isPending ? 'Removing...' : 'Remove Admin Role'}
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  className="w-full justify-start"
                                  onClick={() => handlePromoteUser(user.id, 'ADMIN')}
                                  disabled={updateRoleMutation.isPending}
                                >
                                  <Shield className="h-4 w-4 mr-2" />
                                  {updateRoleMutation.isPending ? 'Promoting...' : 'Promote to Admin'}
                                </Button>
                              )}

                              {user.id === currentUser?.id ? (
                                <Button
                                  variant="outline"
                                  className="w-full justify-start opacity-50"
                                  disabled={true}
                                  title="Cannot block yourself"
                                >
                                  <UserX className="h-4 w-4 mr-2" />
                                  Cannot Block Yourself
                                </Button>
                              ) : user.role === 'ADMIN' ? (
                                <Button
                                  variant="outline"
                                  className="w-full justify-start opacity-50"
                                  disabled={true}
                                  title="Cannot block admin users"
                                >
                                  <UserX className="h-4 w-4 mr-2" />
                                  Cannot Block Admin
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  className="w-full justify-start"
                                  onClick={() => handleBlockUser(user.id, true)}
                                  disabled={updateStatusMutation.isPending}
                                >
                                  <UserX className="h-4 w-4 mr-2" />
                                  {updateStatusMutation.isPending ? 'Blocking...' : 'Block User'}
                                </Button>
                              )}

                              {user.id === currentUser?.id ? (
                                <Button
                                  variant="outline"
                                  className="w-full justify-start opacity-50 text-gray-500"
                                  disabled={true}
                                  title="Cannot delete yourself"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Cannot Delete Yourself
                                </Button>
                              ) : user.role === 'ADMIN' ? (
                                <Button
                                  variant="outline"
                                  className="w-full justify-start opacity-50 text-gray-500"
                                  disabled={true}
                                  title="Cannot delete admin users"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Cannot Delete Admin
                                </Button>
                              ) : (
                                <Button
                                  variant="destructive"
                                  className="w-full justify-start"
                                  onClick={() => handleConfirmDelete(user)}
                                  disabled={deleteUserMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  {deleteUserMutation.isPending ? 'Deleting...' : 'Delete User'}
                                </Button>
                              )}
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
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No users found</p>
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
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, pagination?.total || 0)} of {pagination?.total || 0} users
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
                  Page {currentPage} of {pagination?.totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(pagination?.totalPages || 1, prev + 1))}
                  disabled={currentPage === (pagination?.totalPages || 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite User Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite New User</DialogTitle>
            <DialogDescription>
              Send an invitation to a new user to join the system
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="user@example.com"
                value={inviteData.email}
                onChange={(e) => {
                  setInviteData(prev => ({ ...prev, email: e.target.value }));
                  if (inviteErrors.email) {
                    setInviteErrors(prev => ({ ...prev, email: "" }));
                  }
                }}
                className={inviteErrors.email ? "border-red-500" : ""}
              />
              {inviteErrors.email && (
                <p className="text-sm text-red-500 mt-1">{inviteErrors.email}</p>
              )}
            </div>
            <div>
              <Label htmlFor="invite-role">Role</Label>
              <Select
                value={inviteData.role}
                onValueChange={(value) => {
                  setInviteData(prev => ({ ...prev, role: value as UserRole }));
                  if (inviteErrors.role) {
                    setInviteErrors(prev => ({ ...prev, role: "" }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="QC">QC</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
              {inviteErrors.role && (
                <p className="text-sm text-red-500 mt-1">{inviteErrors.role}</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteData({ email: "", role: "USER" });
                  setInviteErrors({});
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleInviteUser} disabled={inviteUserMutation.isPending}>
                {inviteUserMutation.isPending ? "Sending..." : "Send Invitation"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-email">Email Address</Label>
              <Input
                id="edit-email"
                type="email"
                placeholder="user@example.com"
                value={editData.email}
                onChange={(e) => {
                  setEditData(prev => ({ ...prev, email: e.target.value }));
                  if (editErrors.email) {
                    setEditErrors(prev => ({ ...prev, email: "" }));
                  }
                }}
                className={editErrors.email ? "border-red-500" : ""}
              />
              {editErrors.email && (
                <p className="text-sm text-red-500 mt-1">{editErrors.email}</p>
              )}
            </div>
            <div>
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={editData.role}
                onValueChange={(value) => {
                  setEditData(prev => ({ ...prev, role: value as UserRole }));
                  if (editErrors.role) {
                    setEditErrors(prev => ({ ...prev, role: "" }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="QC">QC</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
              {editErrors.role && (
                <p className="text-sm text-red-500 mt-1">{editErrors.role}</p>
              )}
            </div>
            <div>
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={editData.status}
                onValueChange={(value) => {
                  setEditData(prev => ({ ...prev, status: value as UserStatus }));
                  if (editErrors.status) {
                    setEditErrors(prev => ({ ...prev, status: "" }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="BLOCKED">Blocked</SelectItem>
                  <SelectItem value="INVITED">Invited</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                </SelectContent>
              </Select>
              {editErrors.status && (
                <p className="text-sm text-red-500 mt-1">{editErrors.status}</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingUser(null);
                  setEditData({ email: "", role: "USER", status: "ACTIVE" });
                  setEditErrors({});
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateUser} disabled={updateRoleMutation.isPending}>
                {updateRoleMutation.isPending ? "Updating..." : "Update User"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Detailed information about {detailsUser?.email}
            </DialogDescription>
          </DialogHeader>
          {detailsUser && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Email</Label>
                  <p className="text-sm">{detailsUser.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Role</Label>
                  <Badge variant={getRoleBadgeVariant(detailsUser.role)} className="mt-1">
                    {detailsUser.role}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <Badge variant={getStatusBadgeVariant("active")} className="mt-1">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">User ID</Label>
                  <p className="text-sm font-mono">{detailsUser.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Joined</Label>
                  <p className="text-sm">{format(new Date(detailsUser.createdAt), 'PPP')}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Last Login</Label>
                  <p className="text-sm">
                    {detailsUser.lastLoginAt
                      ? format(new Date(detailsUser.lastLoginAt), 'PPp')
                      : 'Never'
                    }
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-sm font-medium text-gray-500">Activity Summary</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-2xl font-bold">{detailsUser.processCount || 0}</p>
                    <p className="text-sm text-gray-600">Processes Created</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-2xl font-bold">{detailsUser.activityCount || 0}</p>
                    <p className="text-sm text-gray-600">Total Activities</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  setShowDetailsModal(false);
                  handleEditUser(detailsUser);
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit User
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the user account and all associated data.
            </DialogDescription>
          </DialogHeader>
          {userToDelete && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm">
                  <strong>User:</strong> {userToDelete.email}
                </p>
                <p className="text-sm">
                  <strong>Role:</strong> {userToDelete.role}
                </p>
                <p className="text-sm">
                  <strong>Processes:</strong> {userToDelete.processCount || 0}
                </p>
                <p className="text-sm">
                  <strong>Activities:</strong> {userToDelete.activityCount || 0}
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setUserToDelete(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteUser(userToDelete.id)}
                  disabled={deleteUserMutation.isPending}
                >
                  {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};