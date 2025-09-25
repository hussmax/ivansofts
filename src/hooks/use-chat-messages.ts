import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { showError, showSuccess } from '@/utils/toast';
import { useAuth } from '@/context/AuthContext';
import { Reaction } from '@/components/MessageReactions'; // Import Reaction interface

export interface Message {
  id: string;
  user_id: string; // The ID of the user who sent the message
  sender_name: string;
  sender_avatar_url?: string | null; // New field for sender's avatar URL
  content: string;
  created_at: string;
  receiver_id?: string; // Only present for private messages
  is_edited: boolean; // New field to indicate if the message has been edited
  edited_at: string | null; // New field for the last edited timestamp
  reactions: Reaction[]; // New field for message reactions
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
        .select('id, sender_id, receiver_id, content, created_at, is_edited, edited_at, profiles(display_name, avatar_url), private_message_reactions(emoji, user_id, profiles(display_name))') // Select new fields including reactions
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedUserId}),and(sender_id.eq.${selectedUserId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: false }) // Fetch in reverse order to get latest first
        .range(from, to);
    } else {
      // Fetch global messages
      query = supabase
        .from('messages')
        .select('id, user_id, content, created_at, is_edited, edited_at, profiles(display_name, avatar_url), message_reactions(emoji, user_id, profiles(display_name))') // Select new fields including reactions
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
        is_edited: msg.is_edited || false,
        edited_at: msg.edited_at || null,
        reactions: (selectedUserId ? msg.private_message_reactions : msg.message_reactions)?.map((r: any) => ({
          emoji: r.emoji,
          user_id: r.user_id,
          user_display_name: r.profiles?.display_name || 'Anonymous',
        })) || [],
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
  }, [selectedUserId, user, fetchMessages]);

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

  const editMessage = useCallback(async (messageId: string, newContent: string, isPrivate: boolean) => {
    if (!user) {
      showError('You must be logged in to edit messages.');
      return;
    }

    let error;
    const updateData = {
      content: newContent,
      is_edited: true,
      edited_at: new Date().toISOString(),
    };

    if (isPrivate) {
      const { error: privateError } = await supabase
        .from('private_messages')
        .update(updateData)
        .eq('id', messageId)
        .eq('sender_id', user.id); // Ensure only sender can edit
      error = privateError;
    } else {
      const { error: globalError } = await supabase
        .from('messages')
        .update(updateData)
        .eq('id', messageId)
        .eq('user_id', user.id); // Ensure only sender can edit
      error = globalError;
    }

    if (error) {
      showError('Error editing message: ' + error.message);
    } else {
      showSuccess('Message updated successfully!');
      // The real-time listener will update the state, no need to manually update here
    }
  }, [user]);

  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) {
      showError('You must be logged in to add reactions.');
      return;
    }

    let error;
    if (selectedUserId) {
      const { error: privateReactionError } = await supabase
        .from('private_message_reactions')
        .insert({ message_id: messageId, user_id: user.id, emoji });
      error = privateReactionError;
    } else {
      const { error: globalReactionError } = await supabase
        .from('message_reactions')
        .insert({ message_id: messageId, user_id: user.id, emoji });
      error = globalReactionError;
    }

    if (error) {
      showError('Error adding reaction: ' + error.message);
    }
  }, [user, selectedUserId]);

  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) {
      showError('You must be logged in to remove reactions.');
      return;
    }

    let error;
    if (selectedUserId) {
      const { error: privateReactionError } = await supabase
        .from('private_message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji);
      error = privateReactionError;
    } else {
      const { error: globalReactionError } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji);
      error = globalReactionError;
    }

    if (error) {
      showError('Error removing reaction: ' + error.message);
    }
  }, [user, selectedUserId]);

  useEffect(() => {
    if (!user) return;

    let channel;
    const handleNewMessage = async (payload: any) => {
      const newMsg = payload.new;
      const senderId = selectedUserId ? newMsg.sender_id : newMsg.user_id;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
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
          sender_avatar_url: profile?.avatar_url || null,
          content: newMsg.content,
          created_at: newMsg.created_at,
          receiver_id: newMsg.receiver_id,
          is_edited: newMsg.is_edited || false,
          edited_at: newMsg.edited_at || null,
          reactions: [], // New messages start with no reactions
        },
      ]);
    };

    const handleUpdateMessage = async (payload: any) => {
      const updatedMsg = payload.new;
      const senderId = selectedUserId ? updatedMsg.sender_id : updatedMsg.user_id;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', senderId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching sender profile for updated message:', error.message);
      }

      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === updatedMsg.id
            ? {
                ...msg,
                content: updatedMsg.content,
                is_edited: updatedMsg.is_edited || false,
                edited_at: updatedMsg.edited_at || null,
                sender_name: profile?.display_name || 'Anonymous',
                sender_avatar_url: profile?.avatar_url || null,
              }
            : msg
        )
      );
    };

    const handleDeleteMessage = (payload: any) => {
      const deletedMsgId = payload.old.id;
      setMessages((prevMessages) => prevMessages.filter((msg) => msg.id !== deletedMsgId));
    };

    const handleReactionChange = async (payload: any, isDelete: boolean) => {
      const reactionData = payload.new || payload.old;
      const messageId = reactionData.message_id;
      const reactorId = reactionData.user_id;
      const emoji = reactionData.emoji;

      const { data: reactorProfile, error } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', reactorId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching reactor profile:', error.message);
        return;
      }

      const newReaction: Reaction = {
        emoji,
        user_id: reactorId,
        user_display_name: reactorProfile?.display_name || 'Anonymous',
      };

      setMessages((prevMessages) =>
        prevMessages.map((msg) => {
          if (msg.id === messageId) {
            const updatedReactions = isDelete
              ? msg.reactions.filter(
                  (r) => !(r.user_id === newReaction.user_id && r.emoji === newReaction.emoji)
                )
              : [...msg.reactions, newReaction];
            return { ...msg, reactions: updatedReactions };
          }
          return msg;
        })
      );
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
          event: 'UPDATE',
          schema: 'public',
          table: 'private_messages',
          filter: `or(and(sender_id.eq.${user.id},receiver_id.eq.${selectedUserId}),and(sender_id.eq.${selectedUserId},receiver_id.eq.${user.id}))`,
        },
        handleUpdateMessage
      ).on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'private_messages',
          filter: `or(and(sender_id.eq.${user.id},receiver_id.eq.${selectedUserId}),and(sender_id.eq.${selectedUserId},receiver_id.eq.${user.id}))`,
        },
        handleDeleteMessage
      ).on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_message_reactions',
          filter: `or(message_id.in.(select id from private_messages where sender_id = '${user.id}' and receiver_id = '${selectedUserId}'), message_id.in.(select id from private_messages where sender_id = '${selectedUserId}' and receiver_id = '${user.id}'))`,
        },
        (payload) => handleReactionChange(payload, false)
      ).on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'private_message_reactions',
          filter: `or(message_id.in.(select id from private_messages where sender_id = '${user.id}' and receiver_id = '${selectedUserId}'), message_id.in.(select id from private_messages where sender_id = '${selectedUserId}' and receiver_id = '${user.id}'))`,
        },
        (payload) => handleReactionChange(payload, true)
      ).subscribe();
    } else {
      channel = supabase.channel('global-chat-room');
      channel.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        handleNewMessage
      ).on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        handleUpdateMessage
      ).on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        handleDeleteMessage
      ).on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_reactions' },
        (payload) => handleReactionChange(payload, false)
      ).on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'message_reactions' },
        (payload) => handleReactionChange(payload, true)
      ).subscribe();
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [selectedUserId, user]);

  return { messages, loadingMessages, setMessages, deleteMessage, editMessage, addReaction, removeReaction, hasMore, loadMoreMessages };
};