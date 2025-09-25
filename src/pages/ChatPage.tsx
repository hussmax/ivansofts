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
import { ArrowLeft, Trash2 } from 'lucide-react';
import UserSidebar from '@/components/UserSidebar';
import MobileSidebar from '@/components/MobileSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useChatMessages, Message } from '@/hooks/use-chat-messages';
import UserAvatar from '@/components/UserAvatar';
import TypingIndicator from '@/components/TypingIndicator'; // Import TypingIndicator
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const ChatPage = () => {
  const { user, typingUsers, sendTypingStatus } = useAuth(); // Get typingUsers and sendTypingStatus from AuthContext
  const [newMessage, setNewMessage] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { messages, loadingMessages, setMessages, deleteMessage } = useChatMessages({ selectedUserId });

  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !user) return;

    // Clear typing status after sending message
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    await sendTypingStatus(false, selectedUserId);

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
        content: newMessage.trim(),
      });

      if (error) {
        showError('Error sending global message: ' + error.message);
      } else {
        setNewMessage('');
      }
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    await deleteMessage(messageId, !!selectedUserId);
  };

  const handleSelectUser = (userId: string | null, userName: string | null) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
    setIsMobileSidebarOpen(false); // Close mobile sidebar after selection
    setMessages([]); // Clear messages when switching chat
  };

  const handleNewMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (!user) return;

    // Send typing status
    sendTypingStatus(true, selectedUserId);

    // Clear previous timeout if exists
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set a new timeout to send 'not typing' after a delay
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(false, selectedUserId);
    }, 3000); // 3 seconds delay
  };

  // Filter typing users for the current chat context
  const currentChatTypingUsers = typingUsers.filter(
    (typingUser) =>
      typingUser.id !== user?.id && // Exclude current user
      (selectedUserId === null || typingUser.id === selectedUserId) // Only show for selected user in private chat, or all in global
  );

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
                {loadingMessages ? (
                  <p className="text-center text-gray-500 dark:text-gray-400">Loading messages...</p>
                ) : messages.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400">
                    {selectedUserName ? `Start your private chat with ${selectedUserName}!` : 'No messages yet. Start chatting!'}
                  </p>
                ) : (
                  messages.map((msg) => {
                    const isCurrentUser = msg.user_id === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex items-start gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isCurrentUser && (
                          <UserAvatar
                            src={msg.sender_avatar_url}
                            alt={msg.sender_name}
                            fallback={msg.sender_name}
                            className="h-8 w-8"
                          />
                        )}
                        <div className="flex flex-col">
                          <span className={`text-xs mb-1 ${isCurrentUser ? 'text-right' : 'text-left'} text-gray-500 dark:text-gray-400`}>
                            {isCurrentUser ? `You (${msg.sender_name})` : msg.sender_name}
                          </span>
                          <div
                            className={`max-w-[70%] p-3 rounded-lg relative group ${
                              isCurrentUser
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                            }`}
                          >
                            <p className="text-base">{msg.content}</p>
                            <p className="text-xs text-right opacity-75 mt-1">
                              {new Date(msg.created_at).toLocaleTimeString()}
                            </p>
                            {isCurrentUser && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    aria-label="Delete message"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will permanently delete your message.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteMessage(msg.id)}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </div>
                        {isCurrentUser && (
                          <UserAvatar
                            src={msg.sender_avatar_url}
                            alt={msg.sender_name}
                            fallback={msg.sender_name}
                            className="h-8 w-8"
                          />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
            {currentChatTypingUsers.length > 0 && (
              <div className="mb-2">
                {currentChatTypingUsers.map((typingUser) => (
                  <TypingIndicator key={typingUser.id} userName={typingUser.display_name} />
                ))}
              </div>
            )}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                type="text"
                placeholder={selectedUserName ? `Message ${selectedUserName}...` : "Type your message..."}
                value={newMessage}
                onChange={handleNewMessageChange} // Use the new handler
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