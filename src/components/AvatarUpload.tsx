import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl?: string | null;
}

const AvatarUpload = ({ userId, currentAvatarUrl }: AvatarUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const { updateUserAvatar } = useAuth();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      showError('You must select an image to upload.');
      return;
    }

    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}.${fileExt}`; // Use user ID as file name
    const filePath = `public/${fileName}`;

    setUploading(true);

    try {
      // Upload file to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('avatars') // Assuming a bucket named 'avatars'
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true, // Overwrite existing file
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL of the uploaded file
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const newAvatarUrl = publicUrlData.publicUrl;

      // Update the user's profile in the database
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({ id: userId, avatar_url: newAvatarUrl, updated_at: new Date().toISOString() }, { onConflict: 'id' });

      if (updateError) {
        throw updateError;
      }

      updateUserAvatar(newAvatarUrl); // Update context
      showSuccess('Avatar uploaded successfully!');
    } catch (error: any) {
      showError('Error uploading avatar: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="avatar">Upload Avatar</Label>
      <Input
        id="avatar"
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={uploading}
        className="w-full"
      />
      {uploading && <p className="text-sm text-gray-500 dark:text-gray-400">Uploading...</p>}
    </div>
  );
};

export default AvatarUpload;