/**
 * Reports hook for fetching and managing report data
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { processService } from '../services/processService';
import { adminService } from '../services/adminService';
import type { Process, AdminProcess, UserProfile } from '../types/api';

export interface ReportStats {
  totalProcesses: number;
  activeProcesses: number;
  completedProcesses: number;
  pendingProcesses: number;
  averageCompletionTime?: number;
}

export interface ProcessStatusData {
  status: string;
  count: number;
  percentage: number;
}

export interface ProcessStageData {
  stage: string;
  count: number;
  percentage: number;
}

export interface TimelineDataPoint {
  date: string;
  created: number;
  completed: number;
}

export interface UserActivityData {
  userId: string;
  userEmail: string;
  processCount: number;
  activeCount: number;
  completedCount: number;
}

export interface ReportData {
  stats: ReportStats;
  processData: {
    byStatus: ProcessStatusData[];
    byStage: ProcessStageData[];
    processes: (Process | AdminProcess)[];
  };
  timelineData: TimelineDataPoint[];
  userActivityData: UserActivityData[];
  users?: UserProfile[];
}

interface UseReportsOptions {
  userId?: string;
  dateRange?: '7d' | '30d' | '90d' | 'all';
}

export function useReports(options: UseReportsOptions = {}) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const { userId, dateRange = '30d' } = options;

  // Fetch processes based on user role
  const { data: processes, isLoading: processesLoading, isError: processesError, refetch: refetchProcesses } = useQuery({
    queryKey: ['reports', 'processes', userId, dateRange, isAdmin],
    queryFn: async () => {
      try {
        // For now, all users (including admin) use the regular process endpoint
        // TODO: Implement admin-specific endpoint in backend for cross-user process viewing
        const allProcesses = await processService.getProcesses();
        
        // Filter by date range
        const filteredProcesses = filterProcessesByDateRange(allProcesses, dateRange);
        
        // For admin viewing specific user, filter by userId if the process has userId field
        if (isAdmin && userId && userId !== 'all') {
          return filteredProcesses.filter(p => {
            // Check if process has userId field (AdminProcess type)
            return 'userId' in p && p.userId === userId;
          });
        }
        
        return filteredProcesses;
      } catch (error) {
        console.error('Error fetching processes for reports:', error);
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000,
  });

  // Fetch users list (admin only)
  const { data: usersData } = useQuery({
    queryKey: ['reports', 'users'],
    queryFn: async () => {
      try {
        const response = await adminService.getUsers({ limit: 1000 });
        return response.data;
      } catch (error) {
        console.error('Error fetching users for reports:', error);
        // Return empty array on error so the UI doesn't break
        return [];
      }
    },
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  // Process the data
  const reportData = React.useMemo(() => {
    console.log('Processing report data:', { 
      processCount: processes?.length, 
      isAdmin, 
      dateRange,
      hasUsers: !!usersData 
    });

    if (!processes || processes.length === 0) {
      console.log('No processes available for reports');
      return {
        stats: {
          totalProcesses: 0,
          activeProcesses: 0,
          completedProcesses: 0,
          pendingProcesses: 0,
        },
        processData: {
          byStatus: [],
          byStage: [],
          processes: [],
        },
        timelineData: [],
        userActivityData: [],
        users: usersData || [],
      };
    }

    // Calculate stats
    const stats = calculateStats(processes);
    console.log('Calculated stats:', stats);
    
    // Process status distribution
    const byStatus = calculateStatusDistribution(processes);
    console.log('Status distribution:', byStatus);
    
    // Process stage distribution
    const byStage = calculateStageDistribution(processes);
    console.log('Stage distribution:', byStage);
    
    // Timeline data
    const timelineData = calculateTimelineData(processes, dateRange);
    
    // User activity (admin only)
    const userActivityData = isAdmin ? calculateUserActivity(processes) : [];

    return {
      stats,
      processData: {
        byStatus,
        byStage,
        processes,
      },
      timelineData,
      userActivityData,
      users: usersData || [],
    };
  }, [processes, usersData, isAdmin, dateRange]);

  return {
    ...reportData,
    isLoading: processesLoading,
    isError: processesError,
    refetch: refetchProcesses,
  };
}

// Helper functions

function getDateFromRange(range: string): string | undefined {
  if (range === 'all') return undefined;
  
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function filterProcessesByDateRange(processes: Process[], range: string): Process[] {
  if (range === 'all') return processes;
  
  const cutoffDate = new Date();
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return processes.filter(p => new Date(p.createdAt) >= cutoffDate);
}

function calculateStats(processes: (Process | AdminProcess)[]): ReportStats {
  const total = processes.length;
  const active = processes.filter(p => 
    p.status === 'PROCESSING' || p.status === 'SEARCHING' || p.status === 'VALIDATING' || p.status === 'UPLOADING'
  ).length;
  const completed = processes.filter(p => p.status === 'COMPLETED').length;
  const pending = processes.filter(p => p.status === 'CREATED').length;

  // Calculate average completion time for completed processes
  const completedProcesses = processes.filter(p => p.status === 'COMPLETED');
  let averageCompletionTime: number | undefined;
  
  if (completedProcesses.length > 0) {
    const totalTime = completedProcesses.reduce((sum, p) => {
      const created = new Date(p.createdAt).getTime();
      const updated = new Date(p.updatedAt).getTime();
      return sum + (updated - created);
    }, 0);
    averageCompletionTime = totalTime / completedProcesses.length / (1000 * 60 * 60 * 24); // Convert to days
  }

  return {
    totalProcesses: total,
    activeProcesses: active,
    completedProcesses: completed,
    pendingProcesses: pending,
    averageCompletionTime,
  };
}

function calculateStatusDistribution(processes: (Process | AdminProcess)[]): ProcessStatusData[] {
  const statusCounts: Record<string, number> = {};
  
  processes.forEach(p => {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
  });

  const total = processes.length || 1;
  
  return Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
    percentage: (count / total) * 100,
  }));
}

function calculateStageDistribution(processes: (Process | AdminProcess)[]): ProcessStageData[] {
  const stageCounts: Record<string, number> = {};
  
  processes.forEach(p => {
    stageCounts[p.currentStep] = (stageCounts[p.currentStep] || 0) + 1;
  });

  const total = processes.length || 1;
  
  return Object.entries(stageCounts).map(([stage, count]) => ({
    stage,
    count,
    percentage: (count / total) * 100,
  }));
}

function calculateTimelineData(
  processes: (Process | AdminProcess)[],
  range: string
): TimelineDataPoint[] {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;
  const dataPoints: TimelineDataPoint[] = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const created = processes.filter(p => 
      p.createdAt.startsWith(dateStr)
    ).length;
    
    const completed = processes.filter(p => 
      p.status === 'COMPLETED' && p.updatedAt.startsWith(dateStr)
    ).length;
    
    dataPoints.push({
      date: dateStr,
      created,
      completed,
    });
  }
  
  return dataPoints;
}

function calculateUserActivity(processes: (Process | AdminProcess)[]): UserActivityData[] {
  const userMap: Record<string, UserActivityData> = {};
  
  processes.forEach(p => {
    // Only process AdminProcess items that have userId and userEmail
    if ('userId' in p && 'userEmail' in p) {
      if (!userMap[p.userId]) {
        userMap[p.userId] = {
          userId: p.userId,
          userEmail: p.userEmail,
          processCount: 0,
          activeCount: 0,
          completedCount: 0,
        };
      }
      
      userMap[p.userId].processCount++;
      
      if (p.status === 'PROCESSING' || p.status === 'SEARCHING' || p.status === 'VALIDATING' || p.status === 'UPLOADING') {
        userMap[p.userId].activeCount++;
      }
      
      if (p.status === 'COMPLETED') {
        userMap[p.userId].completedCount++;
      }
    }
  });
  
  return Object.values(userMap).sort((a, b) => b.processCount - a.processCount);
}

// Add React import for useMemo
import React from 'react';
