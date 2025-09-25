import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { SmilePlus, Smile } from 'lucide-react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

export interface Reaction {
  emoji: string;
  user_id: string;
  user_display_name: string;
}

interface MessageReactionsProps {
  messageId: string;
  reactions: Reaction[];
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
}

const MessageReactions = ({ messageId, reactions, onAddReaction, onRemoveReaction }: MessageReactionsProps) => {
  const { user } = useAuth();
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = { count: 0, users: [] };
    }
    acc[reaction.emoji].count++;
    acc[reaction.emoji].users.push(reaction.user_display_name);
    return acc;
  }, {} as Record<string, { count: number; users: string[] }>);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    if (!user) return;

    const userReaction = reactions.find(
      (r) => r.emoji === emojiData.emoji && r.user_id === user.id
    );

    if (userReaction) {
      onRemoveReaction(messageId, emojiData.emoji);
    } else {
      onAddReaction(messageId, emojiData.emoji);
    }
    setIsPickerOpen(false);
  };

  return (
    <div className="flex items-center gap-1 mt-1 flex-wrap">
      {Object.entries(groupedReactions).map(([emoji, data]) => {
        const hasUserReacted = reactions.some(
          (r) => r.emoji === emoji && r.user_id === user?.id
        );
        return (
          <TooltipProvider key={emoji}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="secondary"
                  className={cn(
                    "cursor-pointer flex items-center gap-1 px-2 py-1 text-xs",
                    hasUserReacted && "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700"
                  )}
                  onClick={() => handleEmojiClick({ emoji, names: [], unified: '', originalUnified: '', imageUrl: '', emojiVersion: '', type: 'emoji' })}
                >
                  <span>{emoji}</span>
                  <span className="font-bold">{data.count}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{data.users.join(', ')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}

      <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Add reaction"
            disabled={!user}
          >
            <SmilePlus className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <EmojiPicker onEmojiClick={handleEmojiClick} theme={document.documentElement.classList.contains('dark') ? Theme.DARK : Theme.LIGHT} />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default MessageReactions;