import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ThemeToggle';
import UserSidebar from '@/components/UserSidebar';
import MobileSidebar from '@/components/MobileSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/context/AuthContext';
import { MadeWithDyad } from './made-with-dyad'; // Ensure MadeWithDyad is imported

interface ChatLayoutProps {
  children: React.ReactNode;
  selectedUserId: string | null;
  selectedUserName: string | null;
  onSelectUser: (userId: string | null, userName: string | null) => void;
}

const ChatLayout = ({ children, selectedUserId, selectedUserName, onSelectUser }: ChatLayoutProps) => {
  const { user } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="flex flex-col md:flex-row gap-4 w-full max-w-full md:max-w-6xl h-[calc(100vh-2rem)]">
        <Card className="flex-1 flex flex-col">
          <CardHeader className="border-b p-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              {isMobile && (
                <MobileSidebar
                  isOpen={isMobileSidebarOpen}
                  onOpenChange={setIsMobileSidebarOpen}
                  onSelectUser={onSelectUser}
                  selectedUserId={selectedUserId}
                />
              )}
              <Button variant="ghost" size="icon" asChild>
                <Link to="/dashboard">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <CardTitle className="text-2xl">
                {isMobile ? 'Chat' : (selectedUserName ? `Chat with ${selectedUserName}` : 'Global Chat')}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {user && (
                <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:inline">
                  Logged in as: {user.display_name || user.phone || 'Anonymous'}
                </span>
              )}
              <ThemeToggle />
            </div>
          </CardHeader>
          {children}
        </Card>
        {!isMobile && (
          <UserSidebar
            onSelectUser={onSelectUser}
            selectedUserId={selectedUserId}
          />
        )}
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default ChatLayout;