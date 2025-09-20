import { useState } from "react";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { ProcessDashboard, ProcessWorkflow } from "@/components/process";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.png";
import { ActivityLog } from "@/components/activity/ActivityLog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Process } from "@/types/api";

type ViewMode = 'dashboard' | 'workflow';

const Index = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const { toast } = useToast();
  const { user, logout } = useAuth();

  const handleSelectProcess = (process: Process) => {
    setSelectedProcess(process);
    setViewMode('workflow');
  };

  const handleBackToDashboard = () => {
    setSelectedProcess(null);
    setViewMode('dashboard');
  };

  const handleLogout = async () => {
    try {
      await logout();
      setViewMode('dashboard');
      setSelectedProcess(null);
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to logout. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-academic-light">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <img src={logo} alt="ScholarFinder Logo" className="w-10 h-10 object-contain" />
              <div>
                <h1 className="text-xl font-bold">ScholarFinder</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">Welcome, {user?.email}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Content with Process Management */}
        <Tabs defaultValue="processes" className="space-y-4">
          <TabsList className={`grid w-full ${user?.role === "ADMIN" ? "grid-cols-3" : "grid-cols-2"} max-w-md`}>
            <TabsTrigger value="processes">Processes</TabsTrigger>
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
            {user?.role === "ADMIN" && (
              <TabsTrigger value="admin">Admin</TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="processes">
            {viewMode === 'dashboard' ? (
              <ProcessDashboard onSelectProcess={handleSelectProcess} />
            ) : selectedProcess ? (
              <ProcessWorkflow 
                processId={selectedProcess.id}
                onBack={handleBackToDashboard}
              />
            ) : (
              <ProcessDashboard onSelectProcess={handleSelectProcess} />
            )}
          </TabsContent>
          
          <TabsContent value="activity">
            <ActivityLog userId={user?.id} currentUser={user?.id} />
          </TabsContent>

          {user?.role === "ADMIN" && (
            <TabsContent value="admin">
              <AdminDashboard />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
