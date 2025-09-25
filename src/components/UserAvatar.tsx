import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserIcon } from 'lucide-react';

interface UserAvatarProps {
  src?: string | null;
  alt: string;
  fallback: string;
  className?: string;
}

const UserAvatar = ({ src, alt, fallback, className }: UserAvatarProps) => {
  return (
    <Avatar className={className}>
      {src ? (
        <AvatarImage src={src} alt={alt} />
      ) : (
        <AvatarFallback>
          {fallback.substring(0, 2).toUpperCase()}
        </AvatarFallback>
      )}
    </Avatar>
  );
};

export default UserAvatar;