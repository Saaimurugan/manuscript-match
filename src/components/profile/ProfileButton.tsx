import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ProfileModal } from "./ProfileModal";
import { cn } from "@/lib/utils";

interface ProfileButtonProps {
  variant?: "default" | "minimal" | "sidebar";
  className?: string;
  showLabel?: boolean;
}

export const ProfileButton: React.FC<ProfileButtonProps> = ({ 
  variant = "default", 
  className,
  showLabel = true 
}) => {
  const { user } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);

  const getInitials = (email: string) => {
    return email.split('@')[0].substring(0, 2).toUpperCase();
  };

  if (variant === "minimal") {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowProfileModal(true)}
          className={cn("p-2", className)}
        >
          <Avatar className="w-6 h-6">
            <AvatarFallback className="text-xs">
              {user?.email ? getInitials(user.email) : 'U'}
            </AvatarFallback>
          </Avatar>
        </Button>
        <ProfileModal open={showProfileModal} onOpenChange={setShowProfileModal} />
      </>
    );
  }

  if (variant === "sidebar") {
    return (
      <>
        <button
          onClick={() => setShowProfileModal(true)}
          className={cn(
            "w-full flex items-center px-2 py-2 rounded-lg text-left transition-colors hover:bg-gray-100",
            className
          )}
        >
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-blue-100 text-blue-600">
              {user?.email ? getInitials(user.email) : 'U'}
            </AvatarFallback>
          </Avatar>
          {showLabel && (
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{user?.email}</p>
              <p className="text-xs text-gray-500">
                {user?.role || 'User'}
              </p>
            </div>
          )}
        </button>
        <ProfileModal open={showProfileModal} onOpenChange={setShowProfileModal} />
      </>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setShowProfileModal(true)}
        className={cn("flex items-center gap-2", className)}
      >
        <Avatar className="w-6 h-6">
          <AvatarFallback>
            {user?.email ? getInitials(user.email) : 'U'}
          </AvatarFallback>
        </Avatar>
        {showLabel && (
          <span>{user?.name || user?.email || 'Profile'}</span>
        )}
        <Settings className="w-4 h-4" />
      </Button>
      <ProfileModal open={showProfileModal} onOpenChange={setShowProfileModal} />
    </>
  );
};