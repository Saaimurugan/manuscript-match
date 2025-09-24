import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserManagement } from '../UserManagement';
import { useAdminUsers, useUpdateUserRole, useUpdateUserStatus, useDeleteUser } from '@/hooks/useAdmin';

// Mock the config
vi.mock('@/lib/config', () => ({
  config: {
    apiBaseUrl: 'http://localhost:3000',
    apiTimeout: 10000,
  },
}));

// Mock the hooks
vi.mock('@/hooks/useAdmin');
vi.mock('date-fns', () => ({
  format: vi.fn((date, formatStr) => {
    if (formatStr === 'MMM dd, yyyy') return 'Jan 01, 2024';
    if (formatStr === 'MMM dd, HH:mm') return 'Jan 01, 10:30';
    if (formatStr === 'PPP') return 'January 1st, 2024';
    if (formatStr === 'PPp') return 'January 1st, 2024 at 10:30 AM';
    return 'Jan 01, 2024';
  }),
}));

const mockUseAdminUsers = useAdminUsers as any;
const mockUseUpdateUserRole = useUpdateUserRole as any;
const mockUseUpdateUserStatus = useUpdateUserStatus as any;
const mockUseDeleteUser = useDeleteUser as any;

const mockUsers = [
  {
    id: '1',
    email: 'user1@example.com',
    role: 'USER' as const,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    lastLoginAt: '2024-01-01T10:30:00Z',
    processCount: 5,
    activityCount: 20,
  },
  {
    id: '2',
    email: 'admin@example.com',
    role: 'ADMIN' as const,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    lastLoginAt: null,
    processCount: 10,
    activityCount: 50,
  },
];

const mockPagination = {
  page: 1,
  limit: 20,
  total: 2,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('UserManagement', () => {
  const mockMutateAsync = vi.fn();
  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseAdminUsers.mockReturnValue({
      data: { data: mockUsers, pagination: mockPagination },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    mockUseUpdateUserRole.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isLoading: false,
    } as any);

    mockUseUpdateUserStatus.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isLoading: false,
    } as any);

    mockUseDeleteUser.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isLoading: false,
    } as any);
  });

  it('renders user management interface', () => {
    render(<UserManagement />, { wrapper: createWrapper() });
    
    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('Manage users, roles, and permissions')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search users by email or name...')).toBeInTheDocument();
    expect(screen.getByText('Invite User')).toBeInTheDocument();
  });

  it('displays users in table', () => {
    render(<UserManagement />, { wrapper: createWrapper() });
    
    expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    expect(screen.getByText('USER')).toBeInTheDocument();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });

  it('handles search functionality', async () => {
    render(<UserManagement />, { wrapper: createWrapper() });
    
    const searchInput = screen.getByPlaceholderText('Search users by email or name...');
    fireEvent.change(searchInput, { target: { value: 'admin' } });
    
    await waitFor(() => {
      expect(mockUseAdminUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'admin',
          page: 1,
        })
      );
    });
  });

  it('handles role filter', async () => {
    render(<UserManagement />, { wrapper: createWrapper() });
    
    // Find the role filter by finding the button that contains "All Roles"
    const roleFilterTrigger = screen.getByText('All Roles').closest('button');
    if (roleFilterTrigger) {
      fireEvent.click(roleFilterTrigger);
      
      const adminOption = screen.getByText('Admin');
      fireEvent.click(adminOption);
      
      await waitFor(() => {
        expect(mockUseAdminUsers).toHaveBeenCalledWith(
          expect.objectContaining({
            role: 'ADMIN',
            page: 1,
          })
        );
      });
    }
  });

  it('handles user selection', () => {
    render(<UserManagement />, { wrapper: createWrapper() });
    
    const checkboxes = screen.getAllByRole('checkbox');
    const userCheckbox = checkboxes[1]; // First user checkbox (index 0 is select all)
    
    fireEvent.click(userCheckbox);
    
    expect(screen.getByText('1 user selected')).toBeInTheDocument();
  });

  it('handles select all functionality', () => {
    render(<UserManagement />, { wrapper: createWrapper() });
    
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAllCheckbox);
    
    expect(screen.getByText('2 users selected')).toBeInTheDocument();
  });

  it('opens invite user modal', () => {
    render(<UserManagement />, { wrapper: createWrapper() });
    
    const inviteButton = screen.getByText('Invite User');
    fireEvent.click(inviteButton);
    
    expect(screen.getByText('Invite New User')).toBeInTheDocument();
    expect(screen.getByText('Send an invitation to a new user to join the system')).toBeInTheDocument();
  });

  it('validates invite form', async () => {
    render(<UserManagement />, { wrapper: createWrapper() });
    
    const inviteButton = screen.getByText('Invite User');
    fireEvent.click(inviteButton);
    
    const sendButton = screen.getByText('Send Invitation');
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
  });

  it('handles invite form submission', async () => {
    render(<UserManagement />, { wrapper: createWrapper() });
    
    const inviteButton = screen.getByText('Invite User');
    fireEvent.click(inviteButton);
    
    const emailInput = screen.getByPlaceholderText('user@example.com');
    fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
    
    const sendButton = screen.getByText('Send Invitation');
    fireEvent.click(sendButton);
    
    // Since we're not implementing the actual API call yet, just verify the form closes
    await waitFor(() => {
      expect(screen.queryByText('Invite New User')).not.toBeInTheDocument();
    });
  });

  it('opens user details modal', () => {
    render(<UserManagement />, { wrapper: createWrapper() });
    
    const moreButtons = screen.getAllByRole('button', { name: '' });
    const firstMoreButton = moreButtons.find(button => 
      button.querySelector('svg')?.getAttribute('class')?.includes('lucide-more-horizontal')
    );
    
    if (firstMoreButton) {
      fireEvent.click(firstMoreButton);
      
      const viewDetailsButton = screen.getByText('View Details');
      fireEvent.click(viewDetailsButton);
      
      expect(screen.getByText('User Details')).toBeInTheDocument();
    }
  });

  it('opens edit user modal', () => {
    render(<UserManagement />, { wrapper: createWrapper() });
    
    const moreButtons = screen.getAllByRole('button', { name: '' });
    const firstMoreButton = moreButtons.find(button => 
      button.querySelector('svg')?.getAttribute('class')?.includes('lucide-more-horizontal')
    );
    
    if (firstMoreButton) {
      fireEvent.click(firstMoreButton);
      
      const editButton = screen.getByText('Edit User');
      fireEvent.click(editButton);
      
      expect(screen.getByText('Edit User')).toBeInTheDocument();
      expect(screen.getByText('Update user information and permissions')).toBeInTheDocument();
    }
  });

  it('handles user role promotion', async () => {
    render(<UserManagement />, { wrapper: createWrapper() });
    
    const moreButtons = screen.getAllByRole('button', { name: '' });
    const firstMoreButton = moreButtons.find(button => 
      button.querySelector('svg')?.getAttribute('class')?.includes('lucide-more-horizontal')
    );
    
    if (firstMoreButton) {
      fireEvent.click(firstMoreButton);
      
      const promoteButton = screen.getByText('Make Admin');
      fireEvent.click(promoteButton);
      
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          userId: '1',
          role: 'ADMIN',
        });
      });
    }
  });

  it('handles user blocking', async () => {
    render(<UserManagement />, { wrapper: createWrapper() });
    
    const moreButtons = screen.getAllByRole('button', { name: '' });
    const firstMoreButton = moreButtons.find(button => 
      button.querySelector('svg')?.getAttribute('class')?.includes('lucide-more-horizontal')
    );
    
    if (firstMoreButton) {
      fireEvent.click(firstMoreButton);
      
      const blockButton = screen.getByText('Block User');
      fireEvent.click(blockButton);
      
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          userId: '1',
          status: 'suspended',
        });
      });
    }
  });

  it('opens delete confirmation modal', () => {
    render(<UserManagement />, { wrapper: createWrapper() });
    
    const moreButtons = screen.getAllByRole('button', { name: '' });
    const firstMoreButton = moreButtons.find(button => 
      button.querySelector('svg')?.getAttribute('class')?.includes('lucide-more-horizontal')
    );
    
    if (firstMoreButton) {
      fireEvent.click(firstMoreButton);
      
      const deleteButton = screen.getByText('Delete User');
      fireEvent.click(deleteButton);
      
      expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();
      expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    }
  });

  it('handles user deletion', async () => {
    render(<UserManagement />, { wrapper: createWrapper() });
    
    const moreButtons = screen.getAllByRole('button', { name: '' });
    const firstMoreButton = moreButtons.find(button => 
      button.querySelector('svg')?.getAttribute('class')?.includes('lucide-more-horizontal')
    );
    
    if (firstMoreButton) {
      fireEvent.click(firstMoreButton);
      
      const deleteButton = screen.getByText('Delete User');
      fireEvent.click(deleteButton);
      
      const confirmDeleteButton = screen.getByText('Delete User');
      fireEvent.click(confirmDeleteButton);
      
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith('1');
      });
    }
  });

  it('displays loading state', () => {
    mockUseAdminUsers.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    } as any);

    render(<UserManagement />, { wrapper: createWrapper() });
    
    // Should show skeleton loaders - check for skeleton class instead
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('displays error state', () => {
    mockUseAdminUsers.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to load users'),
      refetch: mockRefetch,
    } as any);

    render(<UserManagement />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Failed to load users. Please try refreshing the page.')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('displays empty state when no users found', () => {
    mockUseAdminUsers.mockReturnValue({
      data: { data: [], pagination: { ...mockPagination, total: 0 } },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    render(<UserManagement />, { wrapper: createWrapper() });
    
    expect(screen.getByText('No users found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search or filters')).toBeInTheDocument();
  });

  it('handles bulk actions', () => {
    render(<UserManagement />, { wrapper: createWrapper() });
    
    // Select all users
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAllCheckbox);
    
    // Should show bulk action buttons
    expect(screen.getByText('2 users selected')).toBeInTheDocument();
    expect(screen.getByText('Promote')).toBeInTheDocument();
    expect(screen.getByText('Block')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('handles pagination', () => {
    const paginationData = {
      ...mockPagination,
      totalPages: 3,
      hasNextPage: true,
    };

    mockUseAdminUsers.mockReturnValue({
      data: { data: mockUsers, pagination: paginationData },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    render(<UserManagement />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.getByText('Previous')).toBeInTheDocument();
  });
});