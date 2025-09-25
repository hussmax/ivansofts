import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">Welcome to Your Messaging App</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-6">
          Start connecting with your friends and family!
        </p>
        <Button asChild>
          <Link to="/register">Get Started</Link>
        </Button>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;