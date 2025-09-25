import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { showError, showSuccess } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';

// Extend the User type to include display_name
interface CustomUser extends User {
  display_name?: string;
}

interface OnlineUser {
  id: string;
  display_name: string;
}

interface AuthContextType {
  session: Session | null;
  user: CustomUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  onlineUsers: OnlineUser[];
  updateUserDisplayName: (newDisplayName: string) => void; // New function
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const navigate = useNavigate();

  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('Error fetching user profile:', error.message);
      return null;
    }
    return data?.display_name || null;
  };

  useEffect(() => {
    const getSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        showError(error.message);
      } else {
        if (session?.user) {
          const displayName = await fetchUserProfile(session.user.id);
          setUser({ ...session.user, display_name: displayName });
        } else {
          setUser(null);
        }
        setSession(session);
      }
      setLoading(false);
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const displayName = await fetchUserProfile(session.user.id);
          setUser({ ...session.user, display_name: displayName });
        } else {
          setUser(null);
        }
        setSession(session);
        setLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // New useEffect for presence
  useEffect(() => {
    if (user) {
      const channel = supabase.channel('online-users', {
        config: {
          presence: {
            key: user.id, // Use user ID as the presence key
          },
        },
      });

      channel.on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const currentOnlineUsers: OnlineUser[] = [];
        for (const userId in newState) {
          if (newState[userId].length > 0) {
            const userPresence = newState[userId][0] as { user_id: string; display_name: string };
            currentOnlineUsers.push({ id: userPresence.user_id, display_name: userPresence.display_name });
          }
        }
        setOnlineUsers(currentOnlineUsers);
      });

      channel.on('presence', { event: 'join' }, ({ newPresences }) => {
        setOnlineUsers((prev) => [
          ...prev,
          ...newPresences.map((p: any) => ({ id: p.key, display_name: p.display_name })),
        ]);
      });

      channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
        setOnlineUsers((prev) => prev.filter((onlineUser) => !leftPresences.some((p: any) => p.key === onlineUser.id)));
      });

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: user.id, display_name: user.display_name || user.phone || 'Anonymous' });
        }
      });

      return () => {
        channel.unsubscribe();
      };
    } else {
      setOnlineUsers([]); // Clear online users if no user is logged in
    }
  }, [user]); // Re-run when user changes

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Logged out successfully!");
      setSession(null);
      setUser(null);
      setOnlineUsers([]); // Clear online users on sign out
      navigate("/register"); // Redirect to register page after logout
    }
    setLoading(false);
  };

  const updateUserDisplayName = (newDisplayName: string) => {
    setUser((prevUser) => {
      if (prevUser) {
        return { ...prevUser, display_name: newDisplayName };
      }
      return prevUser;
    });
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut, onlineUsers, updateUserDisplayName }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};