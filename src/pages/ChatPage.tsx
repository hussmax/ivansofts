import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { showError } from '@/utils/toast';
import { Trash2, Send, MessageCircle, Smile, Edit } from 'lucide-react'; // Import Edit icon
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import ChatLayout from '@/components/ChatLayout';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton for loading indicator

const ChatPage = () => {
  const { user, typingUsers, sendTypingStatus } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string | null>(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null); // New state for editing
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialScrollDone = useRef(false); // To track initial scroll to bottom

  const { messages, loadingMessages, setMessages, deleteMessage, editMessage, hasMore, loadMoreMessages } = useChatMessages({ selectedUserId });

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: behavior,
      });
    }
  }, []);

  // Scroll to bottom on initial load or when selected user changes
  useEffect(() => {
    if (!loadingMessages && !initialScrollDone.current) {
      scrollToBottom('auto'); // Use 'auto' for initial scroll to prevent jarring animation
      initialScrollDone.current = true;
    }
  }, [loadingMessages, scrollToBottom]);

  // Scroll to bottom when new messages arrive (if already at bottom)
  useEffect(() => {
    if (scrollAreaRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 20; // Threshold for "at bottom"

      if (isAtBottom) {
        scrollToBottom();
      }
    }
  }, [messages, scrollToBottom]);

  // Auto-focus the input when selected user changes or editing starts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedUserId, selectedUserName, editingMessageId]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = event.currentTarget;
    if (scrollTop === 0 && hasMore && !loadingMessages) {
      const oldScrollHeight = event.currentTarget.scrollHeight;
      loadMoreMessages();
      // After loading, adjust scroll position to maintain view
      // This needs to be done after messages are updated, so it's handled in the next effect
    }
  }, [hasMore, loadingMessages, loadMoreMessages]);

  // Effect to adjust scroll position after loading older messages
  useEffect(() => {
    if (scrollAreaRef.current && !loadingMessages && messages.length > 0) {
      const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;
      // Only adjust if we were at the top before loading more
      if (scrollTop === 0 && scrollHeight > clientHeight) {
        // This is a bit tricky. We need to wait for the DOM to update with new messages
        // and then set the scroll position. A small timeout can help.
        const prevScrollHeight = scrollAreaRef.current.dataset.prevScrollHeight ? parseInt(scrollAreaRef.current.dataset.prevScrollHeight) : 0;
        if (prevScrollHeight > 0 && scrollHeight > prevScrollHeight) {
          scrollAreaRef.current.scrollTop = scrollHeight - prevScrollHeight;
        }
      }
      scrollAreaRef.current.dataset.prevScrollHeight = scrollAreaRef.current.scrollHeight.toString();
    }
  }, [messages, loadingMessages]);


  const handleSendMessage = async (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !user) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    await sendTypingStatus(false, selectedUserId);

    if (editingMessageId) {
      // If editing, call editMessage
      await editMessage(editingMessageId, newMessage.trim(), !!selectedUserId);
      setEditingMessageId(null);
    } else if (selectedUserId) {
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
    setNewMessage(''); // Clear input after sending or editing
  };

  const handleDeleteMessage = async (messageId: string) => {
    await deleteMessage(messageId, !!selectedUserId);
  };

  const handleEditClick = (message: Message) => {
    setEditingMessageId(message.id);
    setNewMessage(message.content);
    setIsEmojiPickerOpen(false); // Close emoji picker when editing
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setNewMessage('');
  };

  const handleSelectUser = (userId: string | null, userName: string | null) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
    setMessages([]); // Clear messages when switching users
    initialScrollDone.current = false; // Reset for new chat
    setEditingMessageId(null); // Clear editing state
    setNewMessage(''); // Clear input
  };

  const handleNewMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);

    if (!user || editingMessageId) return; // Don't send typing status if editing

    sendTypingStatus(true, selectedUserId);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(false, selectedUserId);
    }, 3000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent new line in textarea
      handleSendMessage(e);
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage((prevMsg) => prevMsg + emojiData.emoji);
    setIsEmojiPickerOpen(false);
    inputRef.current?.focus();
  };

  const formatMessageTimestamp = (timestamp: string, isEdited: boolean, editedAt: string | null) => {
    const date = new Date(timestamp);
    let formattedTime;
    if (isToday(date)) {
      formattedTime = format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      formattedTime = format(date, 'Yesterday HH:mm');
    } else {
      formattedTime = format(date, 'dd/MM/yyyy HH:mm');
    }

    if (isEdited && editedAt) {
      const editedDate = new Date(editedAt);
      const formattedEditedTime = format(editedDate, 'HH:mm');
      return `${formattedTime} (Edited ${formattedEditedTime})`;
    }
    return formattedTime;
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
      (
        (selectedUserId === null && typingUser.typingToUserId === null) ||
        (selectedUserId !== null && typingUser.typingToUserId === user?.id && typingUser.id === selectedUserId)
      )
  );

  return (
    <ChatLayout
      selectedUserId={selectedUserId}
      selectedUserName={selectedUserName}
      onSelectUser={handleSelectUser}
    >
      <CardContent className="flex-1 p-4 overflow-hidden flex flex-col">
        <ScrollArea ref={scrollAreaRef} onScroll={handleScroll} className="flex-1 pr-4 mb-4">
          <div className="space-y-4">
            {loadingMessages && messages.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400">Loading messages...</p>
            ) : (
              <>
                {loadingMessages && hasMore && messages.length > 0 && (
                  <div className="flex justify-center py-2">
                    <Skeleton className="h-4 w-3/4 animate-pulse" />
                  </div>
                )}
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 py-10">
                    <MessageCircle className="h-12 w-12 mb-4" />
                    <p className="text-lg font-medium">
                      {selectedUserName ? `Start your private chat with ${selectedUserName}!` : 'No messages yet. Start chatting!'}
                    </p>
                  </div>
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
                        const isCurrentlyEditing = editingMessageId === msg.id;
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
                                {isCurrentUser ? 'You' : msg.sender_name}
                              </span>
                              <div
                                className={`max-w-[70%] p-3 rounded-lg relative group shadow-sm ${
                                  isCurrentUser
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                                } ${isCurrentlyEditing ? 'ring-2 ring-blue-400 dark:ring-blue-500' : ''}`}
                              >
                                <p className="text-base">{msg.content}</p>
                                <p className="text-xs text-right opacity-75 mt-1">
                                  {formatMessageTimestamp(msg.created_at, msg.is_edited, msg.edited_at)}
                                </p>
                                {isCurrentUser && !isCurrentlyEditing && (
                                  <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      aria-label="Edit message"
                                      onClick={() => handleEditClick(msg)}
                                    >
                                      <Edit className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
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
                                  </div>
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
              </>
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
        <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
          <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                type="button"
                onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
                disabled={!user}
              >
                <Smile className="h-4 w-4" />
                <span className="sr-only">Open emoji picker</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <EmojiPicker onEmojiClick={onEmojiClick} theme="auto" />
            </PopoverContent>
          </Popover>
          <Textarea
            ref={inputRef}
            placeholder={editingMessageId ? "Edit your message..." : (selectedUserName ? `Message ${selectedUserName}...` : "Type your message...")}
            value={newMessage}
            onChange={handleNewMessageChange}
            onKeyDown={handleKeyDown}
            className="flex-1 min-h-[40px] max-h-[120px] resize-y"
            disabled={!user}
            rows={1}
          />
          {editingMessageId && (
            <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={!user}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={!user || newMessage.trim() === ''} size="icon">
            {editingMessageId ? <Edit className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            <span className="sr-only">{editingMessageId ? "Update message" : "Send message"}</span>
          </Button>
        </form>
      </CardContent>
    </ChatLayout>
  );
};

export default ChatPage;