import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { ThemeToggle } from '@/components/ThemeToggle';
import UserAvatar from '@/components/UserAvatar'; // Import UserAvatar

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const displayName = user?.display_name || user?.phone || 'Anonymous';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="flex flex-row justify-between items-center w-full pb-2">
          <CardTitle className="text-3xl">Dashboard</CardTitle>
          <ThemeToggle />
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="flex flex-col items-center mb-4">
            <UserAvatar
              src={user?.avatar_url}
              alt={displayName}
              fallback={displayName}
              className="h-24 w-24 mb-4"
            />
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Welcome, {displayName}!
            </h2>
            <CardDescription className="mt-2">
              This is your personalized space.
            </CardDescription>
          </div>
          <p className="text-lg text-gray-700 dark:text-gray-300">
            You are successfully logged in.
          </p>
          <div className="flex flex-col space-y-2">
            <Button asChild>
              <Link to="/profile">View Profile</Link>
            </Button>
            <Button asChild>
              <Link to="/chat">Go to Chat</Link>
            </Button>
            <Button onClick={signOut} variant="outline">
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>
      <MadeWithDyad />
    </div>
  );
};

export default Dashboard;