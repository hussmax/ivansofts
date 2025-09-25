import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import ProfileForm from '@/components/ProfileForm'; // Import the new ProfileForm

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">User Profile</CardTitle>
          <CardDescription>Manage your account information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-lg">
            <strong>Display Name:</strong> {user.display_name || user.phone || 'Anonymous'}
          </p>
          <p className="text-lg">
            <strong>User ID:</strong> {user.id}
          </p>
          {user.phone && (
            <p className="text-lg">
              <strong>Phone Number:</strong> {user.phone}
            </p>
          )}
          <ProfileForm /> {/* Integrate the ProfileForm here */}
          <Button onClick={signOut} className="w-full" variant="destructive">
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;