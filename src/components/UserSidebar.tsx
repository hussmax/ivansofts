import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { showError } from '@/utils/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User } from 'lucide-react'; // For a generic user icon
import { useAuth } from '@/context/AuthContext'; // Import useAuth

interface UserProfile {
  id: string;
  display_name: string;
}

const UserSidebar = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { onlineUsers } = useAuth(); // Get onlineUsers from AuthContext

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
        setUsers(data || []);
      }
      setLoading(false);
    };

    fetchUsers();

    // Optional: Real-time updates for user profiles (e.g., new users registering or updating their name)
    const channel = supabase
      .channel('user-profiles')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          // For simplicity, re-fetch all users on any profile change
          fetchUsers(); 
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Card className="w-full md:w-64 h-full flex flex-col">
      <CardHeader className="border-b p-4">
        <CardTitle className="text-xl">Users Online</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-4 overflow-hidden">
        {loading ? (
          <p className="text-center text-gray-500 dark:text-gray-400">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400">No other users found.</p>
        ) : (
          <ScrollArea className="h-full pr-4">
            <div className="space-y-2">
              {users.map((userProfile) => {
                const isOnline = onlineUsers.includes(userProfile.id); // Check if user is online
                return (
                  <div key={userProfile.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
                    <div className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} /> {/* Online indicator */}
                    <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span className="font-medium">{userProfile.display_name}</span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default UserSidebar;