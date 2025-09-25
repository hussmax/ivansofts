import React, { useState, useEffect, useRef } from 'react';
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

interface Message {
  id: string;
  user_id: string;
  sender_name: string; // Changed from sender_phone
  content: string;
  created_at: string;
}

const ChatPage = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        showError('Error fetching messages: ' + error.message);
      } else {
        setMessages(data || []);
      }
    };

    fetchMessages();

    const channel = supabase
      .channel('global-chat-room')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages((prevMessages) => [...prevMessages, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !user) return;

    const { error } = await supabase.from('messages').insert({
      user_id: user.id,
      sender_name: user.display_name || user.phone || 'Anonymous', // Use display_name
      content: newMessage.trim(),
    });

    if (error) {
      showError('Error sending message: ' + error.message);
    } else {
      setNewMessage('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-2xl h-[80vh] flex flex-col">
        <CardHeader className="border-b p-4 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <CardTitle className="text-2xl">Global Chat</CardTitle>
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
                <p className="text-center text-gray-500 dark:text-gray-400">No messages yet. Start chatting!</p>
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
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1"
              disabled={!user}
            />
            <Button type="submit" disabled={!user}>Send</Button>
          </form>
        </CardContent>
      </Card>
      <MadeWithDyad />
    </div>
  );
};

export default ChatPage;