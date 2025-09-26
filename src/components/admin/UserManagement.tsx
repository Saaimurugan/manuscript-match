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
import { cn } from "@/lib/utils";
import type { AdminUserDetails } from "@/services/adminService";
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
  const updateRoleMutation = useUpdateUserRole() as any;
  const updateStatusMutation = useUpdateUserStatus();
  const deleteUserMutation = useDeleteUser();
  const inviteUserMutation = useInviteUser();

  const users = (usersData as PaginatedResponse<AdminUserDetails>)?.data || [];
  const pagination = (usersData as PaginatedResponse<AdminUserDetails>)?.pagination;

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
    updateRoleMutation.mutate({
      userId,
      role: newRole as "USER" | "ADMIN"
    }, {
      onSuccess: () => {
        refetchUsers();
      },
      onError: (error: any) => {
        console.error('Failed to update user role:', error);
      }
    });
  };

  const handleBlockUser = async (userId: string, block: boolean) => {
    try {
      await updateStatusMutation.mutateAsync({
        userId,
        status: block ? 'suspended' : 'active'
      });
      refetchUsers();
    } catch (error) {
      console.error('Failed to update user status:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUserMutation.mutateAsync(userId);
      refetchUsers();
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
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

    // Use mutate instead of mutateAsync to let the hook handle success/error
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

        // Show success message
        toast({
          title: "Success",
          description: `Invitation sent to ${inviteData.email}`,
          variant: "default",
        });
      },
      onError: (error: any) => {
        console.log('Component onError - Full error object:', error);
        console.log('Component onError - error.response:', error?.response);
        console.log('Component onError - error.response.data:', error?.response?.data);

        // Extract and show the specific error message
        let errorMessage = 'Failed to invite user';

        if (error?.response?.data?.error) {
          errorMessage = error.response.data.error;
          console.log('Using error.response.data.error:', errorMessage);
        } else if (error?.response?.data?.message) {
          errorMessage = error.response.data.message;
          console.log('Using error.response.data.message:', errorMessage);
        } else if (error?.message) {
          errorMessage = error.message;
          console.log('Using error.message:', errorMessage);
        }

        console.log('Final error message to show:', errorMessage);

        // Show error message directly
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
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
      updateRoleMutation.mutate({
        userId: editingUser.id,
        role: editData.role as "USER" | "ADMIN"
      }, {
        onSuccess: () => {
          // Reset form and close modal
          setEditingUser(null);
          setEditData({ email: "", role: "USER", status: "ACTIVE" });
          setEditErrors({});
          setShowEditModal(false);
          refetchUsers();
        },
        onError: (error: any) => {
          console.error('Failed to update user:', error);
        }
      });
    } else {
      // No role change, just close modal
      setEditingUser(null);
      setEditData({ email: "", role: "USER", status: "ACTIVE" });
      setEditErrors({});
      setShowEditModal(false);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedUsers.length === 0) return;

    try {
      switch (action) {
        case 'promote':
          // TODO: Implement bulk promotion
          console.log('Bulk promote users:', selectedUsers);
          break;
        case 'block':
          // TODO: Implement bulk blocking
          console.log('Bulk block users:', selectedUsers);
          break;
        case 'delete':
          if (window.confirm(`Are you sure you want to delete ${selectedUsers.length} users? This action cannot be undone.`)) {
            // TODO: Implement bulk deletion
            console.log('Bulk delete users:', selectedUsers);
          }
          break;
        case 'export':
          // TODO: Implement user export
          console.log('Export users:', selectedUsers);
          break;
      }
    } catch (error) {
      console.error('Failed to perform bulk action:', error);
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
          {selectedUsers.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">
                  {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('promote')}>
                    <Shield className="h-4 w-4 mr-1" />
                    Promote
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('block')}>
                    <UserX className="h-4 w-4 mr-1" />
                    Block
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('delete')}>
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
          )}
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
                    <TableHead>Activity</TableHead>
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
                            <div className="font-medium">{user.email}</div>
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
                      <TableCell>
                        <div className="text-sm">
                          <div>{user.processCount || 0} processes</div>
                          <div className="text-gray-500">{user.activityCount || 0} activities</div>
                        </div>
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
                              <Button
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() => handlePromoteUser(user.id, user.role === 'ADMIN' ? 'USER' : 'ADMIN')}
                              >
                                <Shield className="h-4 w-4 mr-2" />
                                {user.role === 'ADMIN' ? 'Remove Admin' : 'Make Admin'}
                              </Button>
                              <Button
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() => handleBlockUser(user.id, true)}
                              >
                                <UserX className="h-4 w-4 mr-2" />
                                Block User
                              </Button>
                              <Button
                                variant="destructive"
                                className="w-full justify-start"
                                onClick={() => handleConfirmDelete(user)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete User
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