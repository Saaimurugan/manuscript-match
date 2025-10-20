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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  Users, 
  Search, 
  Plus, 
  Minus,
  RefreshCw,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Save,
  X,
  UserCheck,
  Crown,
  Briefcase,
  User
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Types
interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  createdAt: Date;
}

interface UserPermission {
  id: string;
  userId: string;
  permissionId: string;
  grantedBy: string;
  grantedAt: Date;
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
  permission?: Permission;
  granter?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

interface RolePermission {
  id: string;
  role: UserRole;
  permissionId: string;
  permission?: Permission;
}

type UserRole = "USER" | "QC" | "MANAGER" | "ADMIN";

interface PermissionManagementProps {
  className?: string;
}

interface PermissionMatrixData {
  permissions: Permission[];
  rolePermissions: Record<UserRole, string[]>;
  userPermissions: Record<string, string[]>;
}

interface CustomPermissionAssignment {
  userId: string;
  userEmail: string;
  userRole: UserRole;
  permissions: string[];
}

export const PermissionManagement: React.FC<PermissionManagementProps> = ({ className }) => {
  const [activeTab, setActiveTab] = useState("matrix");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole | "all">("all");
  const [selectedResource, setSelectedResource] = useState<string>("all");
  
  // Modal states
  const [showCustomPermissionModal, setShowCustomPermissionModal] = useState(false);
  const [showRoleEditorModal, setShowRoleEditorModal] = useState(false);
  const [showConflictResolutionModal, setShowConflictResolutionModal] = useState(false);
  
  // Form states
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  const [pendingPermissions, setPendingPermissions] = useState<string[]>([]);
  const [conflictingPermissions, setConflictingPermissions] = useState<string[]>([]);
  const [viewingUser, setViewingUser] = useState<string | null>(null);
  const [showUserPermissionPreview, setShowUserPermissionPreview] = useState(false);
  
  // Role permissions state
  const [rolePermissions, setRolePermissions] = useState<Record<UserRole, string[]>>({
    USER: ["processes.view"],
    QC: ["processes.view", "activity.view"],
    MANAGER: ["processes.view", "processes.manage", "activity.view", "users.view"],
    ADMIN: ["users.view", "users.manage", "processes.view", "processes.manage", "permissions.assign", "permissions.revoke", "system.monitor", "activity.view"]
  });

  // Mock data - in real implementation, these would come from API hooks
  const mockPermissions: Permission[] = [
    {
      id: "1",
      name: "users.view",
      description: "View user information",
      resource: "users",
      action: "view",
      createdAt: new Date()
    },
    {
      id: "2", 
      name: "users.manage",
      description: "Create, update, and delete users",
      resource: "users",
      action: "manage",
      createdAt: new Date()
    },
    {
      id: "3",
      name: "processes.view",
      description: "View process information",
      resource: "processes", 
      action: "view",
      createdAt: new Date()
    },
    {
      id: "4",
      name: "processes.manage",
      description: "Create, update, and delete processes",
      resource: "processes",
      action: "manage", 
      createdAt: new Date()
    },
    {
      id: "5",
      name: "permissions.assign",
      description: "Assign permissions to users",
      resource: "permissions",
      action: "assign",
      createdAt: new Date()
    },
    {
      id: "6",
      name: "permissions.revoke",
      description: "Revoke permissions from users",
      resource: "permissions",
      action: "revoke",
      createdAt: new Date()
    },
    {
      id: "7",
      name: "system.monitor",
      description: "Monitor system health and performance",
      resource: "system",
      action: "monitor",
      createdAt: new Date()
    },
    {
      id: "8",
      name: "activity.view",
      description: "View activity logs",
      resource: "activity",
      action: "view",
      createdAt: new Date()
    }
  ];



  const mockUsers = [
    { id: "5ad7e131-4a5f-455b-a7cc-18d4a3bbc99a", email: "user@test.com", role: "USER" as UserRole },
    { id: "38d51725-082b-4b52-b397-bb6da737b490", email: "user2@test.com", role: "USER" as UserRole },
    { id: "1aa37a5f-479f-4c00-b1a6-4a3db7449868", email: "admin@test.com", role: "ADMIN" as UserRole },
    { id: "4", email: "admin1@example.com", role: "ADMIN" as UserRole }
  ];

  const mockUserPermissions: Record<string, string[]> = {
    "5ad7e131-4a5f-455b-a7cc-18d4a3bbc99a": ["processes.manage"], // User with custom permission
    "38d51725-082b-4b52-b397-bb6da737b490": ["users.view"] // User2 with additional permission
  };

  // Filtered permissions based on search and resource filter
  const filteredPermissions = useMemo(() => {
    return mockPermissions.filter(permission => {
      const matchesSearch = searchTerm === "" || 
        permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        permission.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesResource = selectedResource === "all" || permission.resource === selectedResource;
      
      return matchesSearch && matchesResource;
    });
  }, [mockPermissions, searchTerm, selectedResource]);

  // Get unique resources for filter
  const resources = useMemo(() => {
    const resourceSet = new Set(mockPermissions.map(p => p.resource));
    return Array.from(resourceSet);
  }, [mockPermissions]);

  // Role hierarchy for inheritance visualization
  const roleHierarchy: Record<UserRole, number> = {
    USER: 1,
    QC: 2,
    MANAGER: 3,
    ADMIN: 4
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'ADMIN': return Crown;
      case 'MANAGER': return Briefcase;
      case 'QC': return UserCheck;
      default: return User;
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'ADMIN': return 'default';
      case 'MANAGER': return 'secondary';
      case 'QC': return 'outline';
      default: return 'outline';
    }
  };

  const hasPermission = (role: UserRole, permissionName: string): boolean => {
    return rolePermissions[role]?.includes(permissionName) || false;
  };

  const hasCustomPermission = (userId: string, permissionName: string): boolean => {
    return mockUserPermissions[userId]?.includes(permissionName) || false;
  };

  const getEffectivePermissions = (userId: string, userRole: UserRole): string[] => {
    const rolePerms = rolePermissions[userRole] || [];
    const customPerms = mockUserPermissions[userId] || [];
    return [...new Set([...rolePerms, ...customPerms])];
  };

  const handleRolePermissionToggle = (role: UserRole, permissionName: string) => {
    setRolePermissions(prev => {
      const currentPermissions = prev[role] || [];
      const hasPermission = currentPermissions.includes(permissionName);
      
      if (hasPermission) {
        // Remove permission
        return {
          ...prev,
          [role]: currentPermissions.filter(p => p !== permissionName)
        };
      } else {
        // Add permission
        return {
          ...prev,
          [role]: [...currentPermissions, permissionName]
        };
      }
    });
    
    // In real implementation, this would also call an API
    console.log(`Toggle permission ${permissionName} for role ${role}`);
  };

  const handleCustomPermissionToggle = (userId: string, permissionName: string) => {
    // In real implementation, this would call an API
    console.log(`Toggle custom permission ${permissionName} for user ${userId}`);
  };

  const handleSaveRolePermissions = () => {
    if (!editingRole) return;
    // In real implementation, this would call an API
    console.log(`Save permissions for role ${editingRole}`);
    setEditingRole(null);
    setShowRoleEditorModal(false);
  };

  const handleAssignCustomPermissions = () => {
    if (!selectedUser || pendingPermissions.length === 0) return;
    
    // Check for conflicts
    const user = mockUsers.find(u => u.id === selectedUser);
    if (!user) return;
    
    const existingRolePermissions = rolePermissions[user.role] || [];
    const conflicts = pendingPermissions.filter(p => existingRolePermissions.includes(p));
    
    if (conflicts.length > 0) {
      setConflictingPermissions(conflicts);
      setShowConflictResolutionModal(true);
      return;
    }
    
    // In real implementation, this would call an API
    console.log(`Assign permissions ${pendingPermissions} to user ${selectedUser}`);
    
    // Reset form
    setSelectedUser("");
    setPendingPermissions([]);
    setShowCustomPermissionModal(false);
  };

  const handleResolveConflicts = (resolution: 'override' | 'skip' | 'cancel') => {
    switch (resolution) {
      case 'override':
        // Proceed with assignment, overriding role permissions
        console.log(`Override conflicts and assign permissions`);
        setSelectedUser("");
        setPendingPermissions([]);
        setConflictingPermissions([]);
        setShowCustomPermissionModal(false);
        setShowConflictResolutionModal(false);
        break;
      case 'skip':
        // Remove conflicting permissions and proceed
        const nonConflictingPermissions = pendingPermissions.filter(p => !conflictingPermissions.includes(p));
        setPendingPermissions(nonConflictingPermissions);
        setConflictingPermissions([]);
        setShowConflictResolutionModal(false);
        if (nonConflictingPermissions.length > 0) {
          handleAssignCustomPermissions();
        }
        break;
      case 'cancel':
        setConflictingPermissions([]);
        setShowConflictResolutionModal(false);
        break;
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Permission Management
              </CardTitle>
              <CardDescription>
                Manage user permissions and role-based access control
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button size="sm" onClick={() => setShowCustomPermissionModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Assign Custom Permission
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search permissions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={selectedResource} onValueChange={setSelectedResource}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Resource" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Resources</SelectItem>
                  {resources.map(resource => (
                    <SelectItem key={resource} value={resource}>
                      {resource.charAt(0).toUpperCase() + resource.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="matrix">Permission Matrix</TabsTrigger>
          <TabsTrigger value="roles">Role Management</TabsTrigger>
          <TabsTrigger value="users">User Permissions</TabsTrigger>
        </TabsList>

        {/* Permission Matrix Tab */}
        <TabsContent value="matrix" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Permission Matrix
              </CardTitle>
              <CardDescription>
                Visual overview of permissions across all roles with inheritance hierarchy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-80">Permission</TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <User className="h-4 w-4" />
                          User
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <UserCheck className="h-4 w-4" />
                          QC
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Briefcase className="h-4 w-4" />
                          Manager
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Crown className="h-4 w-4" />
                          Admin
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPermissions.map((permission) => (
                      <TableRow key={permission.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{permission.name}</div>
                            <div className="text-sm text-gray-500">{permission.description}</div>
                            <Badge variant="outline" className="mt-1 text-xs">
                              {permission.resource}
                            </Badge>
                          </div>
                        </TableCell>
                        {(['USER', 'QC', 'MANAGER', 'ADMIN'] as UserRole[]).map((role) => (
                          <TableCell key={role} className="text-center">
                            <div className="flex items-center justify-center">
                              {hasPermission(role, permission.name) ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <XCircle className="h-5 w-5 text-gray-300" />
                              )}
                            </div>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Role Management Tab */}
        <TabsContent value="roles" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {(['USER', 'QC', 'MANAGER', 'ADMIN'] as UserRole[]).map((role) => {
              const Icon = getRoleIcon(role);
              const permissions = rolePermissions[role] || [];
              
              return (
                <Card key={role}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5" />
                        <CardTitle className="text-lg">{role}</CardTitle>
                      </div>
                      <Badge variant={getRoleBadgeVariant(role)}>
                        Level {roleHierarchy[role]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-sm text-gray-600">
                        {permissions.length} permission{permissions.length !== 1 ? 's' : ''}
                      </div>
                      <div className="space-y-1">
                        {permissions.slice(0, 3).map((permName) => {
                          const perm = mockPermissions.find(p => p.name === permName);
                          return (
                            <div key={permName} className="text-xs text-gray-500">
                              • {perm?.description || permName}
                            </div>
                          );
                        })}
                        {permissions.length > 3 && (
                          <div className="text-xs text-gray-400">
                            +{permissions.length - 3} more...
                          </div>
                        )}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-3"
                        onClick={() => {
                          setEditingRole(role);
                          setShowRoleEditorModal(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Permissions
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Role Inheritance Visualization */}
          <Card>
            <CardHeader>
              <CardTitle>Role Inheritance Hierarchy</CardTitle>
              <CardDescription>
                Higher roles inherit permissions from lower roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center space-x-8">
                {(['USER', 'QC', 'MANAGER', 'ADMIN'] as UserRole[]).map((role, index) => {
                  const Icon = getRoleIcon(role);
                  return (
                    <div key={role} className="flex items-center">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-2">
                          <Icon className="h-8 w-8 text-blue-600" />
                        </div>
                        <div className="font-medium">{role}</div>
                        <div className="text-xs text-gray-500">Level {roleHierarchy[role]}</div>
                      </div>
                      {index < 3 && (
                        <div className="mx-4 text-gray-400">→</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Permissions Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User-Specific Permissions
              </CardTitle>
              <CardDescription>
                View and manage custom permissions assigned to individual users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Role Permissions</TableHead>
                      <TableHead>Custom Permissions</TableHead>
                      <TableHead>Total Effective</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockUsers.map((user) => {
                      const userRolePermissions = rolePermissions[user.role] || [];
                      const customPermissions = mockUserPermissions[user.id] || [];
                      const effectivePermissions = getEffectivePermissions(user.id, user.role);
                      
                      return (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{user.email}</div>
                              <div className="text-sm text-gray-500">ID: {user.id}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(user.role)}>
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {userRolePermissions.length} permission{userRolePermissions.length !== 1 ? 's' : ''}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {customPermissions.length > 0 ? (
                                <>
                                  <div className="text-sm font-medium text-blue-600">
                                    {customPermissions.length} custom
                                  </div>
                                  {customPermissions.slice(0, 2).map((permName) => (
                                    <Badge key={permName} variant="secondary" className="text-xs mr-1">
                                      {permName}
                                    </Badge>
                                  ))}
                                  {customPermissions.length > 2 && (
                                    <div className="text-xs text-gray-400">
                                      +{customPermissions.length - 2} more
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="text-sm text-gray-400">None</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">
                              {effectivePermissions.length} total
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setViewingUser(user.id);
                                  setShowUserPermissionPreview(true);
                                }}
                                title="View user permissions"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  // Edit user permissions
                                  setSelectedUser(user.id);
                                  setShowCustomPermissionModal(true);
                                }}
                                title="Edit user permissions"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Custom Permission Assignment Modal */}
      <Dialog open={showCustomPermissionModal} onOpenChange={setShowCustomPermissionModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Custom Permissions</DialogTitle>
            <DialogDescription>
              Grant additional permissions to a specific user beyond their role permissions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="user-select">Select User</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user..." />
                </SelectTrigger>
                <SelectContent>
                  {mockUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <span>{user.email}</span>
                        <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                          {user.role}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedUser && (
              <div>
                <Label>Available Permissions</Label>
                <ScrollArea className="h-64 border rounded-md p-4">
                  <div className="space-y-2">
                    {filteredPermissions.map((permission) => {
                      const user = mockUsers.find(u => u.id === selectedUser);
                      const hasRolePermission = user && hasPermission(user.role, permission.name);
                      const userHasCustomPermission = hasCustomPermission(selectedUser, permission.name);
                      const isPending = pendingPermissions.includes(permission.name);
                      
                      return (
                        <div key={permission.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={permission.id}
                            checked={isPending}
                            disabled={hasRolePermission || userHasCustomPermission}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setPendingPermissions(prev => [...prev, permission.name]);
                              } else {
                                setPendingPermissions(prev => prev.filter(p => p !== permission.name));
                              }
                            }}
                          />
                          <div className="flex-1">
                            <Label htmlFor={permission.id} className="text-sm font-medium">
                              {permission.name}
                            </Label>
                            <div className="text-xs text-gray-500">{permission.description}</div>
                            {hasRolePermission && (
                              <Badge variant="outline" className="text-xs mt-1">
                                Role Permission
                              </Badge>
                            )}
                            {userHasCustomPermission && (
                              <Badge variant="secondary" className="text-xs mt-1">
                                Already Assigned
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}
            
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCustomPermissionModal(false);
                  setSelectedUser("");
                  setPendingPermissions([]);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAssignCustomPermissions}
                disabled={!selectedUser || pendingPermissions.length === 0}
              >
                <Plus className="h-4 w-4 mr-2" />
                Assign Permissions ({pendingPermissions.length})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Role Permission Editor Modal */}
      <Dialog open={showRoleEditorModal} onOpenChange={setShowRoleEditorModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingRole && (() => {
                const Icon = getRoleIcon(editingRole);
                return <Icon className="h-5 w-5" />;
              })()}
              Edit {editingRole} Role Permissions
            </DialogTitle>
            <DialogDescription>
              Modify the default permissions for the {editingRole} role. Changes will affect all users with this role.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <ScrollArea className="h-96 border rounded-md p-4">
              <div className="space-y-2">
                {filteredPermissions.map((permission) => {
                  const hasRolePermission = editingRole && hasPermission(editingRole, permission.name);
                  
                  return (
                    <div key={permission.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`role-${permission.id}`}
                        checked={hasRolePermission}
                        onCheckedChange={() => {
                          if (editingRole) {
                            handleRolePermissionToggle(editingRole, permission.name);
                          }
                        }}
                      />
                      <div className="flex-1">
                        <Label htmlFor={`role-${permission.id}`} className="text-sm font-medium">
                          {permission.name}
                        </Label>
                        <div className="text-xs text-gray-500">{permission.description}</div>
                        <Badge variant="outline" className="text-xs mt-1">
                          {permission.resource}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowRoleEditorModal(false);
                  setEditingRole(null);
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSaveRolePermissions}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Conflict Resolution Modal */}
      <Dialog open={showConflictResolutionModal} onOpenChange={setShowConflictResolutionModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Permission Conflicts Detected
            </DialogTitle>
            <DialogDescription>
              Some permissions you're trying to assign already exist as role permissions for this user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                The following permissions conflict with the user's role permissions:
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              {conflictingPermissions.map((permName) => {
                const permission = mockPermissions.find(p => p.name === permName);
                return (
                  <div key={permName} className="flex items-center gap-2 p-2 bg-yellow-50 rounded">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <div>
                      <div className="font-medium text-sm">{permName}</div>
                      <div className="text-xs text-gray-600">{permission?.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="text-sm text-gray-600">
              How would you like to resolve these conflicts?
            </div>
            
            <div className="flex flex-col gap-2">
              <Button 
                variant="outline" 
                onClick={() => handleResolveConflicts('override')}
                className="justify-start"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Override - Assign as custom permissions anyway
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleResolveConflicts('skip')}
                className="justify-start"
              >
                <Minus className="h-4 w-4 mr-2" />
                Skip - Only assign non-conflicting permissions
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleResolveConflicts('cancel')}
                className="justify-start"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel - Don't assign any permissions
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Permission Preview Modal */}
      <Dialog open={showUserPermissionPreview} onOpenChange={setShowUserPermissionPreview}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              User Permission Details
            </DialogTitle>
            <DialogDescription>
              Complete overview of permissions for the selected user
            </DialogDescription>
          </DialogHeader>
          {viewingUser && (() => {
            const user = mockUsers.find(u => u.id === viewingUser);
            if (!user) return null;
            
            const userRolePermissions = rolePermissions[user.role] || [];
            const customPermissions = mockUserPermissions[user.id] || [];
            const effectivePermissions = getEffectivePermissions(user.id, user.role);
            const Icon = getRoleIcon(user.role);
            
            return (
              <div className="space-y-6">
                {/* User Info */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <Icon className="h-8 w-8 text-blue-600" />
                  <div>
                    <div className="font-medium text-lg">{user.email}</div>
                    <Badge variant={getRoleBadgeVariant(user.role)} className="mt-1">
                      {user.role}
                    </Badge>
                  </div>
                </div>

                {/* Permission Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{userRolePermissions.length}</div>
                        <div className="text-sm text-gray-600">Role Permissions</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{customPermissions.length}</div>
                        <div className="text-sm text-gray-600">Custom Permissions</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{effectivePermissions.length}</div>
                        <div className="text-sm text-gray-600">Total Effective</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Detailed Permissions */}
                <div className="space-y-4">
                  {/* Role Permissions */}
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Role Permissions ({userRolePermissions.length})
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {userRolePermissions.map((permName) => {
                        const permission = mockPermissions.find(p => p.name === permName);
                        return (
                          <div key={permName} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                            <div>
                              <div className="font-medium text-sm">{permName}</div>
                              <div className="text-xs text-gray-600">{permission?.description}</div>
                            </div>
                            <Badge variant="outline">{permission?.resource}</Badge>
                          </div>
                        );
                      })}
                      {userRolePermissions.length === 0 && (
                        <div className="text-sm text-gray-500 italic">No role permissions</div>
                      )}
                    </div>
                  </div>

                  {/* Custom Permissions */}
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Custom Permissions ({customPermissions.length})
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {customPermissions.map((permName) => {
                        const permission = mockPermissions.find(p => p.name === permName);
                        return (
                          <div key={permName} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                            <div>
                              <div className="font-medium text-sm">{permName}</div>
                              <div className="text-xs text-gray-600">{permission?.description}</div>
                            </div>
                            <Badge variant="secondary">{permission?.resource}</Badge>
                          </div>
                        );
                      })}
                      {customPermissions.length === 0 && (
                        <div className="text-sm text-gray-500 italic">No custom permissions</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowUserPermissionPreview(false);
                      setViewingUser(null);
                    }}
                  >
                    Close
                  </Button>
                  <Button 
                    onClick={() => {
                      setShowUserPermissionPreview(false);
                      setSelectedUser(user.id);
                      setShowCustomPermissionModal(true);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Permissions
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};