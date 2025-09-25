import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { showSuccess, showError } from '@/utils/toast';

const ProfileForm = () => {
  const { user, updateUserDisplayName } = useAuth(); // Destructure updateUserDisplayName
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        setLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
          showError('Error fetching profile: ' + error.message);
        } else if (data) {
          setDisplayName(data.display_name || '');
        }
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, display_name: displayName, updated_at: new Date().toISOString() }, { onConflict: 'id' });

    if (error) {
      showError('Error updating profile: ' + error.message);
    } else {
      showSuccess('Profile updated successfully!');
      updateUserDisplayName(displayName); // Update the display name in AuthContext
    }
    setLoading(false);
  };

  return (
    <CardContent className="space-y-4">
      <form onSubmit={handleUpdateProfile} className="space-y-4">
        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            type="text"
            id="displayName"
            placeholder="Your display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full"
            disabled={loading}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Updating..." : "Update Profile"}
        </Button>
      </form>
    </CardContent>
  );
};

export default ProfileForm;