import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { showError, showSuccess } from '@/utils/toast';
import { useAuth } from '@/context/AuthContext';

export interface Message {
  id: string;
  user_id: string; // The ID of the user who sent the message
  sender_name: string;
  sender_avatar_url?: string | null; // New field for sender's avatar URL
  content: string;
  created_at: string;
  receiver_id?: string; // Only present for private messages
}

interface UseChatMessagesProps {
  selectedUserId: string | null;
}

const PAGE_SIZE = 20; // Number of messages to load per page

export const useChatMessages = ({ selectedUserId }: UseChatMessagesProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [page, setPage] = useState(0); // Current page for pagination
  const [hasMore, setHasMore] = useState(true); // Whether there are more messages to load

  const fetchMessages = useCallback(async (currentPage: number, append: boolean = false) => {
    if (!user) return;

    setLoadingMessages(true);
    const from = currentPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query;
    if (selectedUserId) {
      // Fetch private messages
      query = supabase
        .from('private_messages')
        .select('id, sender_id, receiver_id, content, created_at, profiles(display_name, avatar_url)') // Select avatar_url
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedUserId}),and(sender_id.eq.${selectedUserId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: false }) // Fetch in reverse order to get latest first
        .range(from, to);
    } else {
      // Fetch global messages
      query = supabase
        .from('messages')
        .select('id, user_id, content, created_at, profiles(display_name, avatar_url)') // Select avatar_url
        .order('created_at', { ascending: false }) // Fetch in reverse order to get latest first
        .range(from, to);
    }

    const { data, error } = await query;

    if (error) {
      showError('Error fetching messages: ' + error.message);
      setMessages([]);
      setHasMore(false);
    } else {
      const fetchedMsgs: Message[] = data.map((msg: any) => ({
        id: msg.id,
        user_id: selectedUserId ? msg.sender_id : msg.user_id,
        sender_name: msg.profiles?.display_name || 'Anonymous',
        sender_avatar_url: msg.profiles?.avatar_url || null,
        content: msg.content,
        created_at: msg.created_at,
        receiver_id: selectedUserId ? msg.receiver_id : undefined,
      })).reverse(); // Reverse back to chronological order

      if (append) {
        setMessages((prevMessages) => [...fetchedMsgs, ...prevMessages]);
      } else {
        setMessages(fetchedMsgs);
      }
      setHasMore(fetchedMsgs.length === PAGE_SIZE);
    }
    setLoadingMessages(false);
  }, [selectedUserId, user]);

  const loadMoreMessages = useCallback(() => {
    if (hasMore && !loadingMessages) {
      setPage((prevPage) => prevPage + 1);
    }
  }, [hasMore, loadingMessages]);

  useEffect(() => {
    // When selectedUserId changes, reset page and fetch initial messages
    setPage(0);
    setHasMore(true);
    fetchMessages(0);
  }, [selectedUserId, user, fetchMessages]); // Added user to dependencies

  useEffect(() => {
    // Fetch messages when page changes (for infinite scrolling)
    if (page > 0) {
      fetchMessages(page, true); // Append older messages
    }
  }, [page, fetchMessages]);

  const deleteMessage = useCallback(async (messageId: string, isPrivate: boolean) => {
    if (!user) {
      showError('You must be logged in to delete messages.');
      return;
    }

    let error;
    if (isPrivate) {
      const { error: privateError } = await supabase
        .from('private_messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', user.id); // Ensure only sender can delete
      error = privateError;
    } else {
      const { error: globalError } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('user_id', user.id); // Ensure only sender can delete
      error = globalError;
    }

    if (error) {
      showError('Error deleting message: ' + error.message);
    } else {
      setMessages((prevMessages) => prevMessages.filter((msg) => msg.id !== messageId));
      showSuccess('Message deleted successfully!');
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    let channel;
    const handleNewMessage = async (payload: any) => {
      const newMsg = payload.new;
      const senderId = selectedUserId ? newMsg.sender_id : newMsg.user_id;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('display_name, avatar_url') // Select avatar_url
        .eq('id', senderId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching sender profile for message:', error.message);
      }

      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: newMsg.id,
          user_id: senderId,
          sender_name: profile?.display_name || 'Anonymous',
          sender_avatar_url: profile?.avatar_url || null, // Assign avatar_url
          content: newMsg.content,
          created_at: newMsg.created_at,
          receiver_id: newMsg.receiver_id,
        },
      ]);
    };

    const handleDeleteMessage = (payload: any) => {
      const deletedMsgId = payload.old.id;
      setMessages((prevMessages) => prevMessages.filter((msg) => msg.id !== deletedMsgId));
    };

    if (selectedUserId) {
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
        handleNewMessage
      ).on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'private_messages',
          filter: `or(and(sender_id.eq.${user.id},receiver_id.eq.${selectedUserId}),and(sender_id.eq.${selectedUserId},receiver_id.eq.${user.id}))`,
        },
        handleDeleteMessage
      ).subscribe();
    } else {
      channel = supabase.channel('global-chat-room');
      channel.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        handleNewMessage
      ).on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        handleDeleteMessage
      ).subscribe();
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [selectedUserId, user]);

  return { messages, loadingMessages, setMessages, deleteMessage, hasMore, loadMoreMessages };
};