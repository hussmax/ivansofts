import React from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import UserSidebar from './UserSidebar';

interface MobileSidebarProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectUser: (userId: string | null, userName: string | null) => void; // New prop
  selectedUserId: string | null; // New prop
}

const MobileSidebar = ({ isOpen, onOpenChange, onSelectUser, selectedUserId }: MobileSidebarProps) => {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle User Sidebar</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-64">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Users</SheetTitle>
        </SheetHeader>
        <UserSidebar onSelectUser={onSelectUser} selectedUserId={selectedUserId} />
      </SheetContent>
    </Sheet>
  );
};

export default MobileSidebar;