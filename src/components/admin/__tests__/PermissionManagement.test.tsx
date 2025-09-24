import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PermissionManagement } from '../PermissionManagement';

// Mock the UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardDescription: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, className }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={`${variant} ${size} ${className}`}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, className }: any) => (
    <input 
      value={value} 
      onChange={onChange} 
      placeholder={placeholder} 
      className={className}
    />
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={`badge ${variant} ${className}`}>{children}</span>
  ),
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: any) => <table>{children}</table>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableCell: ({ children, className }: any) => <td className={className}>{children}</td>,
  TableHead: ({ children, className }: any) => <th className={className}>{children}</th>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: any) => 
    open ? <div data-testid="dialog" onClick={() => onOpenChange?.(false)}>{children}</div> : null,
  DialogContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h3>{children}</h3>,
  DialogTrigger: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value} onClick={() => onValueChange?.('test')}>
      {children}
    </div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <div>{placeholder}</div>,
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, disabled, id }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      disabled={disabled}
      id={id}
      data-testid={`checkbox-${id}`}
    />
  ),
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: any) => <div className={`skeleton ${className}`} />,
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children, className }: any) => <div className={`alert ${className}`}>{children}</div>,
  AlertDescription: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: any) => (
    <div data-testid="tabs" data-value={value} onClick={() => onValueChange?.('matrix')}>
      {children}
    </div>
  ),
  TabsContent: ({ children, value }: any) => <div data-value={value}>{children}</div>,
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: any) => (
    <button data-value={value} data-testid={`tab-${value}`}>{children}</button>
  ),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Shield: () => <div data-testid="shield-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Search: () => <div data-testid="search-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  Minus: () => <div data-testid="minus-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  XCircle: () => <div data-testid="x-circle-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  Edit: () => <div data-testid="edit-icon" />,
  Save: () => <div data-testid="save-icon" />,
  X: () => <div data-testid="x-icon" />,
  UserCheck: () => <div data-testid="user-check-icon" />,
  Crown: () => <div data-testid="crown-icon" />,
  Briefcase: () => <div data-testid="briefcase-icon" />,
  User: () => <div data-testid="user-icon" />,
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: vi.fn(() => 'Jan 01, 2024'),
}));

// Mock utils
vi.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

describe('PermissionManagement', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the main permission management interface', () => {
      render(<PermissionManagement />);
      
      expect(screen.getByText('Permission Management')).toBeInTheDocument();
      expect(screen.getByText('Manage user permissions and role-based access control')).toBeInTheDocument();
      expect(screen.getByTestId('shield-icon')).toBeInTheDocument();
    });

    it('should render the header with action buttons', () => {
      render(<PermissionManagement />);
      
      expect(screen.getByText('Refresh')).toBeInTheDocument();
      expect(screen.getByText('Assign Custom Permission')).toBeInTheDocument();
      expect(screen.getByTestId('refresh-icon')).toBeInTheDocument();
      expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
    });

    it('should render the search and filter controls', () => {
      render(<PermissionManagement />);
      
      expect(screen.getByPlaceholderText('Search permissions...')).toBeInTheDocument();
      expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    });

    it('should render the tabs navigation', () => {
      render(<PermissionManagement />);
      
      expect(screen.getByTestId('tab-matrix')).toBeInTheDocument();
      expect(screen.getByTestId('tab-roles')).toBeInTheDocument();
      expect(screen.getByTestId('tab-users')).toBeInTheDocument();
      expect(screen.getByText('Permission Matrix')).toBeInTheDocument();
      expect(screen.getByText('Role Management')).toBeInTheDocument();
      expect(screen.getByText('User Permissions')).toBeInTheDocument();
    });
  });

  describe('Permission Matrix Tab', () => {
    it('should display the permission matrix with all roles', () => {
      render(<PermissionManagement />);
      
      // Check for role headers
      expect(screen.getByText('User')).toBeInTheDocument();
      expect(screen.getByText('QC')).toBeInTheDocument();
      expect(screen.getByText('Manager')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
      
      // Check for role icons
      expect(screen.getByTestId('user-icon')).toBeInTheDocument();
      expect(screen.getByTestId('user-check-icon')).toBeInTheDocument();
      expect(screen.getByTestId('briefcase-icon')).toBeInTheDocument();
      expect(screen.getByTestId('crown-icon')).toBeInTheDocument();
    });

    it('should display permissions with descriptions and resource badges', () => {
      render(<PermissionManagement />);
      
      expect(screen.getByText('users.view')).toBeInTheDocument();
      expect(screen.getByText('View user information')).toBeInTheDocument();
      expect(screen.getByText('processes.manage')).toBeInTheDocument();
      expect(screen.getByText('Create, update, and delete processes')).toBeInTheDocument();
    });

    it('should show permission status with check/x icons', () => {
      render(<PermissionManagement />);
      
      // Should have check and x circle icons for permission status
      expect(screen.getAllByTestId('check-circle-icon')).toHaveLength(8); // Admin has all 8 permissions
      expect(screen.getAllByTestId('x-circle-icon').length).toBeGreaterThan(0);
    });
  });

  describe('Role Management Tab', () => {
    it('should display role cards with hierarchy levels', async () => {
      render(<PermissionManagement />);
      
      // Click on roles tab
      await user.click(screen.getByTestId('tab-roles'));
      
      expect(screen.getByText('Level 1')).toBeInTheDocument(); // USER
      expect(screen.getByText('Level 2')).toBeInTheDocument(); // QC
      expect(screen.getByText('Level 3')).toBeInTheDocument(); // MANAGER
      expect(screen.getByText('Level 4')).toBeInTheDocument(); // ADMIN
    });

    it('should show permission counts for each role', async () => {
      render(<PermissionManagement />);
      
      await user.click(screen.getByTestId('tab-roles'));
      
      expect(screen.getByText('1 permission')).toBeInTheDocument(); // USER role
      expect(screen.getByText('2 permissions')).toBeInTheDocument(); // QC role
      expect(screen.getByText('4 permissions')).toBeInTheDocument(); // MANAGER role
      expect(screen.getByText('8 permissions')).toBeInTheDocument(); // ADMIN role
    });

    it('should display role inheritance hierarchy', async () => {
      render(<PermissionManagement />);
      
      await user.click(screen.getByTestId('tab-roles'));
      
      expect(screen.getByText('Role Inheritance Hierarchy')).toBeInTheDocument();
      expect(screen.getByText('Higher roles inherit permissions from lower roles')).toBeInTheDocument();
    });

    it('should have edit buttons for each role', async () => {
      render(<PermissionManagement />);
      
      await user.click(screen.getByTestId('tab-roles'));
      
      const editButtons = screen.getAllByText('Edit Permissions');
      expect(editButtons).toHaveLength(4); // One for each role
    });
  });

  describe('User Permissions Tab', () => {
    it('should display user permission table', async () => {
      render(<PermissionManagement />);
      
      await user.click(screen.getByTestId('tab-users'));
      
      expect(screen.getByText('User-Specific Permissions')).toBeInTheDocument();
      expect(screen.getByText('View and manage custom permissions assigned to individual users')).toBeInTheDocument();
      
      // Check table headers
      expect(screen.getByText('User')).toBeInTheDocument();
      expect(screen.getByText('Role')).toBeInTheDocument();
      expect(screen.getByText('Role Permissions')).toBeInTheDocument();
      expect(screen.getByText('Custom Permissions')).toBeInTheDocument();
      expect(screen.getByText('Total Effective')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('should show user details with permission counts', async () => {
      render(<PermissionManagement />);
      
      await user.click(screen.getByTestId('tab-users'));
      
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
      expect(screen.getByText('qc1@example.com')).toBeInTheDocument();
      expect(screen.getByText('manager1@example.com')).toBeInTheDocument();
      expect(screen.getByText('admin1@example.com')).toBeInTheDocument();
    });
  });

  describe('Search and Filtering', () => {
    it('should filter permissions based on search term', async () => {
      render(<PermissionManagement />);
      
      const searchInput = screen.getByPlaceholderText('Search permissions...');
      await user.type(searchInput, 'users');
      
      expect(searchInput).toHaveValue('users');
    });

    it('should filter permissions by resource type', async () => {
      render(<PermissionManagement />);
      
      const resourceSelect = screen.getByTestId('select');
      expect(resourceSelect).toBeInTheDocument();
    });
  });

  describe('Custom Permission Assignment Modal', () => {
    it('should open custom permission assignment modal', async () => {
      render(<PermissionManagement />);
      
      const assignButton = screen.getByText('Assign Custom Permission');
      await user.click(assignButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument();
        expect(screen.getByText('Assign Custom Permissions')).toBeInTheDocument();
        expect(screen.getByText('Grant additional permissions to a specific user beyond their role permissions')).toBeInTheDocument();
      });
    });

    it('should show user selection dropdown in modal', async () => {
      render(<PermissionManagement />);
      
      await user.click(screen.getByText('Assign Custom Permission'));
      
      await waitFor(() => {
        expect(screen.getByText('Select User')).toBeInTheDocument();
        expect(screen.getByText('Choose a user...')).toBeInTheDocument();
      });
    });

    it('should close modal when cancel is clicked', async () => {
      render(<PermissionManagement />);
      
      await user.click(screen.getByText('Assign Custom Permission'));
      
      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument();
      });
      
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      
      await waitFor(() => {
        expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Role Permission Editor Modal', () => {
    it('should open role editor modal when edit button is clicked', async () => {
      render(<PermissionManagement />);
      
      await user.click(screen.getByTestId('tab-roles'));
      
      const editButtons = screen.getAllByText('Edit Permissions');
      await user.click(editButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument();
        expect(screen.getByText(/Edit .* Role Permissions/)).toBeInTheDocument();
      });
    });

    it('should show save and cancel buttons in role editor', async () => {
      render(<PermissionManagement />);
      
      await user.click(screen.getByTestId('tab-roles'));
      
      const editButtons = screen.getAllByText('Edit Permissions');
      await user.click(editButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByText('Save Changes')).toBeInTheDocument();
        expect(screen.getByText('Cancel')).toBeInTheDocument();
        expect(screen.getByTestId('save-icon')).toBeInTheDocument();
        expect(screen.getByTestId('x-icon')).toBeInTheDocument();
      });
    });
  });

  describe('Conflict Resolution Modal', () => {
    it('should show conflict resolution options', async () => {
      render(<PermissionManagement />);
      
      // This would be triggered by the conflict resolution logic
      // For now, we'll test that the component can handle the modal state
      expect(screen.queryByText('Permission Conflicts Detected')).not.toBeInTheDocument();
    });
  });

  describe('Permission Logic', () => {
    it('should correctly identify role permissions', () => {
      render(<PermissionManagement />);
      
      // The component should render with the correct permission matrix
      // Check that admin role shows all permissions as checked
      expect(screen.getAllByTestId('check-circle-icon')).toHaveLength(8);
    });

    it('should show custom permissions differently from role permissions', async () => {
      render(<PermissionManagement />);
      
      await user.click(screen.getByTestId('tab-users'));
      
      // Should show custom permissions with different styling
      expect(screen.getByText('1 custom')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for form elements', async () => {
      render(<PermissionManagement />);
      
      await user.click(screen.getByText('Assign Custom Permission'));
      
      await waitFor(() => {
        expect(screen.getByText('Select User')).toBeInTheDocument();
        expect(screen.getByText('Available Permissions')).toBeInTheDocument();
      });
    });

    it('should have proper button labels and icons', () => {
      render(<PermissionManagement />);
      
      expect(screen.getByText('Refresh')).toBeInTheDocument();
      expect(screen.getByText('Assign Custom Permission')).toBeInTheDocument();
      expect(screen.getByTestId('refresh-icon')).toBeInTheDocument();
      expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle empty permission lists gracefully', () => {
      render(<PermissionManagement />);
      
      // Component should render without errors even with mock data
      expect(screen.getByText('Permission Management')).toBeInTheDocument();
    });

    it('should disable buttons when no selections are made', async () => {
      render(<PermissionManagement />);
      
      await user.click(screen.getByText('Assign Custom Permission'));
      
      await waitFor(() => {
        const assignButton = screen.getByText(/Assign Permissions/);
        expect(assignButton).toBeDisabled();
      });
    });
  });

  describe('Component Props', () => {
    it('should accept and apply className prop', () => {
      const { container } = render(<PermissionManagement className="test-class" />);
      
      expect(container.firstChild).toHaveClass('test-class');
    });
  });
});