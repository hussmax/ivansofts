import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { showError } from '@/utils/toast';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import UserSidebar from '@/components/UserSidebar';
import MobileSidebar from '@/components/MobileSidebar';
import { useIsMobile } from '@/hooks/use-mobile';

interface Message {
  id: string;
  user_id: string; // The ID of the user who sent the message
  sender_name: string;
  content: string;
  created_at: string;
  receiver_id?: string; // Only present for private messages
}

const ChatPage = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);

  // Effect to fetch messages based on selected user
  useEffect(() => {
    if (!user) return;

    const fetchMessages = async () => {
      let query;
      if (selectedUserId) {
        // Fetch private messages
        query = supabase
          .from('private_messages')
          .select('id, sender_id, receiver_id, content, created_at, profiles(display_name)')
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedUserId}),and(sender_id.eq.${selectedUserId},receiver_id.eq.${user.id})`)
          .order('created_at', { ascending: true });
      } else {
        // Fetch global messages
        query = supabase
          .from('messages')
          .select('id, user_id, content, created_at, profiles(display_name)')
          .order('created_at', { ascending: true });
      }

      const { data, error } = await query;

      if (error) {
        showError('Error fetching messages: ' + error.message);
      } else {
        if (selectedUserId) {
          // Map private messages to the common Message interface
          const privateMsgs: Message[] = data.map((msg: any) => ({
            id: msg.id,
            user_id: msg.sender_id,
            sender_name: msg.profiles?.display_name || 'Anonymous',
            content: msg.content,
            created_at: msg.created_at,
            receiver_id: msg.receiver_id,
          }));
          setMessages(privateMsgs);
        } else {
          // Map global messages to the common Message interface
          const globalMsgs: Message[] = data.map((msg: any) => ({
            id: msg.id,
            user_id: msg.user_id,
            sender_name: msg.profiles?.display_name || 'Anonymous',
            content: msg.content,
            created_at: msg.created_at,
          }));
          setMessages(globalMsgs);
        }
      }
    };

    fetchMessages();
  }, [selectedUserId, user]); // Re-fetch when selectedUserId or user changes

  // Effect for real-time subscriptions
  useEffect(() => {
    if (!user) return;

    let channel;
    if (selectedUserId) {
      // Private chat channel
      const chatIdentifier = [user.id, selectedUserId].sort().join('_');
      channel = supabase.channel(`private-chat-${chatIdentifier}`);
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages',
          filter: `or(and(sender_id.eq.${user.id},receiver_id.eq.${selectedUserId}),and(sender_id.eq.${selectedUserId},receiver_id.eq.${user.id}))`,
        },
        async (payload) => {
          const newMsg = payload.new as any;
          // Fetch sender's display name
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', newMsg.sender_id)
            .single();

          if (error && error.code !== 'PGRST116') {
            console.error('Error fetching sender profile for private message:', error.message);
          }

          setMessages((prevMessages) => [
            ...prevMessages,
            {
              id: newMsg.id,
              user_id: newMsg.sender_id,
              sender_name: profile?.display_name || 'Anonymous',
              content: newMsg.content,
              created_at: newMsg.created_at,
              receiver_id: newMsg.receiver_id,
            },
          ]);
        }
      ).subscribe();
    } else {
      // Global chat channel
      channel = supabase.channel('global-chat-room');
      channel.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const newMsg = payload.new as any;
          // Fetch sender's display name
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', newMsg.user_id)
            .single();

          if (error && error.code !== 'PGRST116') {
            console.error('Error fetching sender profile for global message:', error.message);
          }

          setMessages((prevMessages) => [
            ...prevMessages,
            {
              id: newMsg.id,
              user_id: newMsg.user_id,
              sender_name: profile?.display_name || 'Anonymous',
              content: newMsg.content,
              created_at: newMsg.created_at,
            },
          ]);
        }
      ).subscribe();
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [selectedUserId, user]); // Re-subscribe when selectedUserId or user changes

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !user) return;

    const senderName = user.display_name || user.phone || 'Anonymous';

    if (selectedUserId) {
      // Send private message
      const { error } = await supabase.from('private_messages').insert({
        sender_id: user.id,
        receiver_id: selectedUserId,
        content: newMessage.trim(),
      });

      if (error) {
        showError('Error sending private message: ' + error.message);
      } else {
        setNewMessage('');
      }
    } else {
      // Send global message
      const { error } = await supabase.from('messages').insert({
        user_id: user.id,
        sender_name: senderName, // This column is in the 'messages' table
        content: newMessage.trim(),
      });

      if (error) {
        showError('Error sending global message: ' + error.message);
      } else {
        setNewMessage('');
      }
    }
  };

  const handleSelectUser = (userId: string | null, userName: string | null) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
    setIsMobileSidebarOpen(false); // Close mobile sidebar after selection
    setMessages([]); // Clear messages when switching chat
  };

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
                  onSelectUser={handleSelectUser}
                  selectedUserId={selectedUserId}
                />
              )}
              <Button variant="ghost" size="icon" asChild>
                <Link to="/dashboard">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <CardTitle className="text-2xl">
                {selectedUserName ? `Chat with ${selectedUserName}` : 'Global Chat'}
              </CardTitle>
            </div>
            {user && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Logged in as: {user.display_name || user.phone || 'Anonymous'}
              </span>
            )}
          </CardHeader>
          <CardContent className="flex-1 p-4 overflow-hidden flex flex-col">
            <ScrollArea ref={scrollAreaRef} className="flex-1 pr-4 mb-4">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400">
                    {selectedUserName ? `Start your private chat with ${selectedUserName}!` : 'No messages yet. Start chatting!'}
                  </p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.user_id === user?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-lg ${
                          msg.user_id === user?.id
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                        }`}
                      >
                        <p className="text-sm font-semibold">{msg.sender_name}</p>
                        <p className="text-base">{msg.content}</p>
                        <p className="text-xs text-right opacity-75 mt-1">
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                type="text"
                placeholder={selectedUserName ? `Message ${selectedUserName}...` : "Type your message..."}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1"
                disabled={!user}
              />
              <Button type="submit" disabled={!user}>Send</Button>
            </form>
          </CardContent>
        </Card>
        {!isMobile && (
          <UserSidebar
            onSelectUser={handleSelectUser}
            selectedUserId={selectedUserId}
          />
        )}
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default ChatPage;