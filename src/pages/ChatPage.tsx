import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { showError } from '@/utils/toast';
import { Trash2 } from 'lucide-react';
import { useChatMessages, Message } from '@/hooks/use-chat-messages';
import UserAvatar from '@/components/UserAvatar';
import TypingIndicator from '@/components/TypingIndicator';
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
import ChatLayout from '@/components/ChatLayout';
import { format, isToday, isYesterday, isSameDay } from 'date-fns'; // Import isSameDay

const ChatPage = () => {
  const { user, typingUsers, sendTypingStatus } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { messages, loadingMessages, setMessages, deleteMessage } = useChatMessages({ selectedUserId });

  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !user) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    await sendTypingStatus(false, selectedUserId);

    if (selectedUserId) {
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
    setMessages([]); // Clear messages when switching users
  };

  const handleNewMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (!user) return;

    sendTypingStatus(true, selectedUserId);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(false, selectedUserId);
    }, 3000);
  };

  const formatMessageTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return format(date, 'Yesterday HH:mm');
    } else {
      return format(date, 'dd/MM/yyyy HH:mm');
    }
  };

  const formatDateSeparator = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return 'Today';
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'dd MMMM yyyy');
    }
  };

  const groupMessagesByDate = (msgs: Message[]) => {
    const grouped: { date: string; messages: Message[] }[] = [];
    let currentDate: string | null = null;

    msgs.forEach((msg) => {
      const msgDate = new Date(msg.created_at);
      if (!currentDate || !isSameDay(new Date(currentDate), msgDate)) {
        currentDate = msg.created_at;
        grouped.push({ date: currentDate, messages: [] });
      }
      grouped[grouped.length - 1].messages.push(msg);
    });
    return grouped;
  };

  const groupedMessages = groupMessagesByDate(messages);

  const currentChatTypingUsers = typingUsers.filter(
    (typingUser) =>
      typingUser.id !== user?.id &&
      (selectedUserId === null || typingUser.id === selectedUserId)
  );

  return (
    <ChatLayout
      selectedUserId={selectedUserId}
      selectedUserName={selectedUserName}
      onSelectUser={handleSelectUser}
    >
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
              groupedMessages.map((group, groupIndex) => (
                <React.Fragment key={group.date}>
                  <div className="relative my-6 flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-300 dark:border-gray-600" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-gray-500 dark:text-gray-400">
                        {formatDateSeparator(group.date)}
                      </span>
                    </div>
                  </div>
                  {group.messages.map((msg) => {
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
                              {formatMessageTimestamp(msg.created_at)}
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
                  })}
                </React.Fragment>
              ))
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
            onChange={handleNewMessageChange}
            className="flex-1"
            disabled={!user}
          />
          <Button type="submit" disabled={!user}>Send</Button>
        </form>
      </CardContent>
    </ChatLayout>
  );
};

export default ChatPage;