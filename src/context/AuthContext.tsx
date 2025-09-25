import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { showError, showSuccess } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';

// Extend the User type to include display_name and avatar_url
interface CustomUser extends User {
  display_name?: string;
  avatar_url?: string; // New field for avatar URL
}

interface OnlineUser {
  id: string;
  display_name: string;
  avatar_url?: string | null; // Add avatar_url to OnlineUser
}

interface TypingUser {
  id: string;
  display_name: string;
  typingToUserId: string | null; // Null for global chat, ID of receiver for private chat
}

interface AuthContextType {
  session: Session | null;
  user: CustomUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  onlineUsers: OnlineUser[];
  typingUsers: TypingUser[]; // New state for typing users
  updateUserDisplayName: (newDisplayName: string) => void;
  updateUserAvatar: (newAvatarUrl: string) => void; // New function for avatar
  sendTypingStatus: (isTyping: boolean, typingToUserId?: string | null) => Promise<void>; // New function to send typing status
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]); // Initialize typingUsers state
  const navigate = useNavigate();

  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('display_name, avatar_url') // Select avatar_url
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('Error fetching user profile:', error.message);
      return { display_name: null, avatar_url: null };
    }
    return { display_name: data?.display_name || null, avatar_url: data?.avatar_url || null };
  };

  useEffect(() => {
    const getSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        showError(error.message);
      } else {
        if (session?.user) {
          const { display_name, avatar_url } = await fetchUserProfile(session.user.id);
          setUser({ ...session.user, display_name, avatar_url });
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
          const { display_name, avatar_url } = await fetchUserProfile(session.user.id);
          setUser({ ...session.user, display_name, avatar_url });
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

  // Presence and Typing Indicator Logic
  useEffect(() => {
    if (!user) {
      setOnlineUsers([]);
      setTypingUsers([]);
      return;
    }

    const globalChannel = supabase.channel('global-presence-and-typing', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    const updateOnlineUsersState = (state: any) => {
      const currentOnlineUsers: OnlineUser[] = [];
      for (const userId in state) {
        if (state[userId].length > 0) {
          const userPresence = state[userId][0] as { user_id: string; display_name: string; avatar_url?: string | null };
          currentOnlineUsers.push({
            id: userPresence.user_id,
            display_name: userPresence.display_name,
            avatar_url: userPresence.avatar_url,
          });
        }
      }
      setOnlineUsers(currentOnlineUsers);
    };

    const updateTypingUsersState = (state: any) => {
      const currentTypingUsers: TypingUser[] = [];
      for (const userId in state) {
        if (state[userId].length > 0) {
          const userPresence = state[userId][0] as { user_id: string; display_name: string; is_typing: boolean; typing_to_user_id: string | null };
          if (userPresence.is_typing && userPresence.user_id !== user.id) {
            currentTypingUsers.push({
              id: userPresence.user_id,
              display_name: userPresence.display_name,
              typingToUserId: userPresence.typing_to_user_id,
            });
          }
        }
      }
      setTypingUsers(currentTypingUsers);
    };

    globalChannel.on('presence', { event: 'sync' }, () => {
      updateOnlineUsersState(globalChannel.presenceState());
      updateTypingUsersState(globalChannel.presenceState());
    });

    globalChannel.on('presence', { event: 'join' }, ({ newPresences }) => {
      updateOnlineUsersState(globalChannel.presenceState());
      updateTypingUsersState(globalChannel.presenceState());
    });

    globalChannel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      updateOnlineUsersState(globalChannel.presenceState());
      updateTypingUsersState(globalChannel.presenceState());
    });

    globalChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await globalChannel.track({
          user_id: user.id,
          display_name: user.display_name || user.phone || 'Anonymous',
          avatar_url: user.avatar_url || null,
          is_typing: false, // Initial typing status
          typing_to_user_id: null, // Initial private typing status
        });
      }
    });

    return () => {
      globalChannel.unsubscribe();
    };
  }, [user]);

  const sendTypingStatus = useCallback(async (isTyping: boolean, typingToUserId: string | null = null) => {
    if (!user) return;

    const channel = supabase.channel('global-presence-and-typing');
    await channel.track({
      user_id: user.id,
      display_name: user.display_name || user.phone || 'Anonymous',
      avatar_url: user.avatar_url || null,
      is_typing: isTyping,
      typing_to_user_id: typingToUserId, // Send the receiver ID
    });
  }, [user]);

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
      setTypingUsers([]); // Clear typing users on sign out
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

  const updateUserAvatar = (newAvatarUrl: string) => {
    setUser((prevUser) => {
      if (prevUser) {
        return { ...prevUser, avatar_url: newAvatarUrl };
      }
      return prevUser;
    });
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut, onlineUsers, typingUsers, updateUserDisplayName, updateUserAvatar, sendTypingStatus }}>
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