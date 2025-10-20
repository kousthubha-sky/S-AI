// routes/dashboard.tsx
import { useAuth0 } from "@auth0/auth0-react";
import { ProtectedRoute } from "~/components/protected-route";
import { Button } from "~/components/ui/button";

export default function Dashboard() {
  const { user, logout } = useAuth0();

  return (
    <ProtectedRoute>
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button 
            onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            variant="outline"
          >
            Logout
          </Button>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Welcome to your Dashboard!</h2>
          
          {user && (
            <div className="space-y-2">
              <p><strong>Name:</strong> {user.name}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>User ID:</strong> {user.sub}</p>
            </div>
          )}
          
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold">Quick Stats</h3>
              <p className="text-2xl font-bold mt-2">42</p>
              <p className="text-sm text-gray-600">Projects</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold">Messages</h3>
              <p className="text-2xl font-bold mt-2">12</p>
              <p className="text-sm text-gray-600">Unread</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="font-semibold">Tasks</h3>
              <p className="text-2xl font-bold mt-2">7</p>
              <p className="text-sm text-gray-600">Pending</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </ProtectedRoute>
  );
}