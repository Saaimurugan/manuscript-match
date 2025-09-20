/**
 * Edit Process Dialog Component
 * Modal dialog for editing existing manuscript analysis processes
 */

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useUpdateProcess } from '@/hooks/useProcesses';
import type { Process, UpdateProcessRequest } from '@/types/api';

const editProcessSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional().or(z.literal('')),
  status: z.enum(['CREATED', 'UPLOADING', 'PROCESSING', 'SEARCHING', 'VALIDATING', 'COMPLETED', 'ERROR']),
});

type EditProcessFormData = z.infer<typeof editProcessSchema>;

interface EditProcessDialogProps {
  process: Process;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditProcessDialog: React.FC<EditProcessDialogProps> = ({ 
  process,
  open, 
  onOpenChange 
}) => {
  const { toast } = useToast();
  const updateProcessMutation = useUpdateProcess();

  const form = useForm<EditProcessFormData>({
    resolver: zodResolver(editProcessSchema),
    defaultValues: {
      title: process.title,
      description: process.description || '',
      status: process.status,
    },
  });

  // Update form values when process changes
  useEffect(() => {
    form.reset({
      title: process.title,
      description: process.description || '',
      status: process.status,
    });
  }, [process, form]);

  const onSubmit = async (data: EditProcessFormData) => {
    try {
      const updateData: UpdateProcessRequest = {
        title: data.title,
        description: data.description,
        status: data.status,
      };

      await updateProcessMutation.mutateAsync({
        processId: process.id,
        data: updateData,
      });
      
      toast({
        title: 'Process updated',
        description: `"${data.title}" has been updated successfully.`,
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update process. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  const getStatusLabel = (status: Process['status']) => {
    switch (status) {
      case 'CREATED':
        return 'Created';
      case 'UPLOADING':
        return 'Uploading';
      case 'PROCESSING':
        return 'Processing';
      case 'SEARCHING':
        return 'Searching';
      case 'VALIDATING':
        return 'Validating';
      case 'COMPLETED':
        return 'Completed';
      case 'ERROR':
        return 'Error';
      default:
        return status;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Process</DialogTitle>
          <DialogDescription>
            Update the details of your manuscript analysis process.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter process title..." 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe your manuscript or research focus..."
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
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
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
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateProcessMutation.isPending}
              >
                {updateProcessMutation.isPending ? 'Updating...' : 'Update Process'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};