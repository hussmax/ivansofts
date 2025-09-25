import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { showError } from '@/utils/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import UserAvatar from './UserAvatar';
import { Input } from '@/components/ui/input';

interface UserProfile {
  id: string;
  display_name: string;
  avatar_url?: string | null;
}

interface UserSidebarProps {
  onSelectUser: (userId: string | null, userName: string | null) => void;
  selectedUserId: string | null;
}

const UserSidebar = ({ onSelectUser, selectedUserId }: UserSidebarProps) => {
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { onlineUsers, user: currentUser } = useAuth();

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .order('display_name', { ascending: true });

      if (error) {
        showError('Error fetching users: ' + error.message);
      } else {
        const usersWithoutCurrentUser = data?.filter(profile => profile.id !== currentUser?.id) || [];
        setAllUsers(usersWithoutCurrentUser);
        setFilteredUsers(usersWithoutCurrentUser);
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
  }, [currentUser]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredUsers(allUsers);
    } else {
      setFilteredUsers(
        allUsers.filter((userProfile) =>
          userProfile.display_name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
  }, [searchTerm, allUsers]);

  const onlineFilteredUsers = filteredUsers.filter(userProfile =>
    onlineUsers.some(onlineUser => onlineUser.id === userProfile.id)
  );
  const offlineFilteredUsers = filteredUsers.filter(userProfile =>
    !onlineUsers.some(onlineUser => onlineUser.id === userProfile.id)
  );

  return (
    <Card className="w-full md:w-64 h-full flex flex-col">
      <CardHeader className="border-b p-4">
        <CardTitle className="text-xl mb-2">Users</CardTitle>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
          <Input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 w-full"
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-4 overflow-hidden flex flex-col">
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
                <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="font-medium">Global Chat</span>
              </div>

              {onlineFilteredUsers.length > 0 && (
                <>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-4 mb-1">Online</h3>
                  {onlineFilteredUsers.map((userProfile) => {
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
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <UserAvatar
                          src={userProfile.avatar_url}
                          alt={userProfile.display_name}
                          fallback={userProfile.display_name}
                          className="h-6 w-6"
                        />
                        <span className="font-medium">{userProfile.display_name}</span>
                      </div>
                    );
                  })}
                </>
              )}

              {offlineFilteredUsers.length > 0 && (
                <>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-4 mb-1">Offline</h3>
                  {offlineFilteredUsers.map((userProfile) => {
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
                        <div className="h-2 w-2 rounded-full bg-gray-400" />
                        <UserAvatar
                          src={userProfile.avatar_url}
                          alt={userProfile.display_name}
                          fallback={userProfile.display_name}
                          className="h-6 w-6"
                        />
                        <span className="font-medium">{userProfile.display_name}</span>
                      </div>
                    );
                  })}
                </>
              )}

              {onlineFilteredUsers.length === 0 && offlineFilteredUsers.length === 0 && searchTerm.trim() !== '' && (
                <p className="text-center text-gray-500 dark:text-gray-400">No users found matching your search.</p>
              )}
              {onlineFilteredUsers.length === 0 && offlineFilteredUsers.length === 0 && searchTerm.trim() === '' && (
                <p className="text-center text-gray-500 dark:text-gray-400">No other users found.</p>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default UserSidebar;