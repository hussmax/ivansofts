import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MadeWithDyad } from '@/components/made-with-dyad';

const Dashboard = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-3xl">Welcome to your Dashboard!</CardTitle>
          <CardDescription>
            Hello, {user?.phone || user?.id}! This is your personalized space.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-lg text-gray-700 dark:text-gray-300">
            You are successfully logged in.
          </p>
          <div className="flex flex-col space-y-2">
            <Button asChild>
              <Link to="/profile">View Profile</Link>
            </Button>
            <Button asChild> {/* Add button for ChatPage */}
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