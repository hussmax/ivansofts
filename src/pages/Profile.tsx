import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import ProfileForm from '@/components/ProfileForm';
import UserAvatar from '@/components/UserAvatar';
import AvatarUpload from '@/components/AvatarUpload';
import { ThemeToggle } from '@/components/ThemeToggle'; // Import ThemeToggle

const Profile = () => {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <p className="text-gray-700 dark:text-gray-300">Loading user data...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-2xl">Not Logged In</CardTitle>
            <CardDescription>Please log in to view your profile.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/register">Go to Register</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayName = user.display_name || user.phone || 'Anonymous';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row justify-between items-center w-full"> {/* Adjusted for ThemeToggle */}
          <CardTitle className="text-2xl">User Profile</CardTitle>
          <ThemeToggle /> {/* Add ThemeToggle here */}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center text-center mb-4">
            <UserAvatar
              src={user.avatar_url}
              alt={displayName}
              fallback={displayName}
              className="h-24 w-24 mb-4"
            />
            <CardDescription>Manage your account information.</CardDescription>
          </div>
          <p className="text-lg">
            <strong>Display Name:</strong> {displayName}
          </p>
          <p className="text-lg">
            <strong>User ID:</strong> {user.id}
          </p>
          {user.phone && (
            <p className="text-lg">
              <strong>Phone Number:</strong> {user.phone}
            </p>
          )}
          <AvatarUpload userId={user.id} currentAvatarUrl={user.avatar_url} />
          <ProfileForm />
          <Button onClick={signOut} className="w-full" variant="destructive">
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;