import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAccessibilityContext } from './AccessibilityProvider';
import { cn } from '@/lib/utils';
import { 
  Eye, 
  Type, 
  Volume2, 
  Settings,
  Contrast,
  ZoomIn,
  Accessibility
} from 'lucide-react';

interface AccessibilityToolbarProps {
  className?: string;
  compact?: boolean;
}

export const AccessibilityToolbar: React.FC<AccessibilityToolbarProps> = ({
  className,
  compact = false
}) => {
  const {
    highContrast,
    largeText,
    screenReader,
    toggleHighContrast,
    toggleLargeText,
    announceMessage,
  } = useAccessibilityContext();

  const handleSkipToContent = () => {
    const mainContent = document.querySelector('main') || document.querySelector('[role="main"]');
    if (mainContent) {
      (mainContent as HTMLElement).focus();
      announceMessage('Skipped to main content');
    }
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkipToContent}
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-primary text-primary-foreground"
        >
          Skip to content
        </Button>
        
        <Button
          variant={highContrast ? "default" : "ghost"}
          size="sm"
          onClick={toggleHighContrast}
          aria-label={`${highContrast ? 'Disable' : 'Enable'} high contrast mode`}
          className="h-8 w-8 p-0"
        >
          <Contrast className="h-4 w-4" />
        </Button>
        
        <Button
          variant={largeText ? "default" : "ghost"}
          size="sm"
          onClick={toggleLargeText}
          aria-label={`${largeText ? 'Disable' : 'Enable'} large text mode`}
          className="h-8 w-8 p-0"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        
        {screenReader && (
          <Badge variant="secondary" className="text-xs">
            <Volume2 className="h-3 w-3 mr-1" />
            SR
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Accessibility className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-sm">Accessibility Options</h3>
          </div>
          
          <div className="space-y-3">
            {/* Skip to Content */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSkipToContent}
              className="w-full justify-start"
            >
              <Settings className="h-4 w-4 mr-2" />
              Skip to main content
            </Button>
            
            {/* High Contrast Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Contrast className="h-4 w-4" />
                <span className="text-sm">High Contrast</span>
              </div>
              <Button
                variant={highContrast ? "default" : "outline"}
                size="sm"
                onClick={toggleHighContrast}
                aria-label={`${highContrast ? 'Disable' : 'Enable'} high contrast mode`}
              >
                {highContrast ? 'On' : 'Off'}
              </Button>
            </div>
            
            {/* Large Text Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                <span className="text-sm">Large Text</span>
              </div>
              <Button
                variant={largeText ? "default" : "outline"}
                size="sm"
                onClick={toggleLargeText}
                aria-label={`${largeText ? 'Disable' : 'Enable'} large text mode`}
              >
                {largeText ? 'On' : 'Off'}
              </Button>
            </div>
            
            {/* Screen Reader Detection */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                <span className="text-sm">Screen Reader</span>
              </div>
              <Badge variant={screenReader ? "default" : "secondary"}>
                {screenReader ? 'Detected' : 'Not detected'}
              </Badge>
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground">
            <p>These settings are saved locally and will persist across sessions.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};