import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  uploadedFile?: File | null;
}

export const FileUpload = ({ onFileUpload, uploadedFile }: FileUploadProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const validateFile = (file: File): boolean => {
    const allowedTypes = [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(doc|docx)$/i)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a .doc or .docx file.",
        variant: "destructive",
      });
      return false;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "File too large",
        description: "File size must be less than 10MB.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleFile = useCallback(async (file: File) => {
    if (!validateFile(file)) return;

    setIsProcessing(true);
    
    try {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      onFileUpload(file);
      toast({
        title: "File uploaded successfully",
        description: `${file.name} has been processed and is ready for analysis.`,
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "There was an error processing your file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [onFileUpload, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const removeFile = () => {
    onFileUpload(null as any);
  };

  if (uploadedFile) {
    return (
      <Card className="border-accent/20 bg-gradient-to-br from-card to-accent/5">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-accent/10 rounded-lg">
                <CheckCircle className="w-5 h-5 text-accent" />
              </div>
              <div>
                <CardTitle className="text-lg">File Ready</CardTitle>
                <CardDescription>Manuscript uploaded and processed</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={removeFile}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-3 p-3 bg-background/50 rounded-lg">
            <FileText className="w-5 h-5 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{uploadedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed border-2">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="w-5 h-5" />
          <span>Upload Manuscript</span>
        </CardTitle>
        <CardDescription>
          Upload your .doc or .docx manuscript file for peer reviewer analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            isDragOver ? "border-primary bg-primary/5" : "border-border",
            isProcessing && "pointer-events-none opacity-50"
          )}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
        >
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            
            {isProcessing ? (
              <div className="space-y-2">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm font-medium">Processing manuscript...</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <p className="text-lg font-medium">
                    {isDragOver ? "Drop your file here" : "Drag & drop your manuscript"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    or click to browse files
                  </p>
                </div>
                
                <input
                  type="file"
                  accept=".doc,.docx"
                  onChange={handleFileInput}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                
                <Button variant="secondary">
                  Choose File
                </Button>
              </>
            )}
          </div>
          
          <div className="mt-6 text-xs text-muted-foreground">
            <p>Supported formats: .doc, .docx</p>
            <p>Maximum file size: 10MB</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};