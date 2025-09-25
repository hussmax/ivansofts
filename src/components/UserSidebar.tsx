import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { showError } from '@/utils/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils'; // Import cn for conditional class names

interface UserProfile {
  id: string;
  display_name: string;
}

interface UserSidebarProps {
  onSelectUser: (userId: string | null, userName: string | null) => void;
  selectedUserId: string | null;
}

const UserSidebar = ({ onSelectUser, selectedUserId }: UserSidebarProps) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { onlineUsers, user: currentUser } = useAuth(); // Get current user to exclude from list

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name')
        .order('display_name', { ascending: true });

      if (error) {
        showError('Error fetching users: ' + error.message);
      } else {
        // Filter out the current logged-in user from the list
        setUsers(data?.filter(profile => profile.id !== currentUser?.id) || []);
      }
      setLoading(false);
    };

    fetchUsers();

    const channel = supabase
      .channel('user-profiles')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          fetchUsers(); 
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]); // Re-run effect if currentUser changes

  return (
    <Card className="w-full md:w-64 h-full flex flex-col">
      <CardHeader className="border-b p-4">
        <CardTitle className="text-xl">Users</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-4 overflow-hidden">
        {loading ? (
          <p className="text-center text-gray-500 dark:text-gray-400">Loading users...</p>
        ) : (
          <ScrollArea className="h-full pr-4">
            <div className="space-y-2">
              {/* Option to go back to Global Chat */}
              <div
                className={cn(
                  "flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700",
                  !selectedUserId && "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                )}
                onClick={() => onSelectUser(null, null)}
              >
                <span className="font-medium">Global Chat</span>
              </div>
              {users.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400">No other users found.</p>
              ) : (
                users.map((userProfile) => {
                  const isOnline = onlineUsers.includes(userProfile.id);
                  const isSelected = selectedUserId === userProfile.id;
                  return (
                    <div
                      key={userProfile.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700",
                        isSelected && "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                      )}
                      onClick={() => onSelectUser(userProfile.id, userProfile.display_name)}
                    >
                      <div className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <span className="font-medium">{userProfile.display_name}</span>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default UserSidebar;