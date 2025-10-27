// routes/dashboard.tsx
import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { ProtectedRoute } from "~/components/protected-route";
import { Button } from "~/components/ui/button";
import { ThemeSwitch } from "~/components/theme/theme-switch";
import { ChatInterface } from "~/components/chat/chat-interface";
import { useAuthApi } from "~/hooks/useAuthApi";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

interface Document {
  id: string;
  filename: string;
  file_type: string;
  text_length: number;
  created_at: string;
  metadata: any;
}

export default function Dashboard() {
  const { user, logout } = useAuth0();
  const { fetchWithAuth } = useAuthApi();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<string>("");
  const [userTier, setUserTier] = useState<'free' | 'pro'>('free');
  const [messageCount, setMessageCount] = useState<number>(0);
  const [nextResetTime, setNextResetTime] = useState<string>('');

  useEffect(() => {
    loadDocuments();
    checkUserSubscription();
    
    // Set up polling for message count updates
    const pollInterval = setInterval(checkUserSubscription, 60000); // Poll every minute
    return () => clearInterval(pollInterval);
  }, []);

  const checkUserSubscription = async () => {
    try {
      const usage = await fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/api/usage`);
      if (usage.subscription_tier) {
        // Map the subscription tier to either 'free' or 'pro'
        const tier = usage.subscription_tier === 'basic' ? 'free' : 'pro';
        setUserTier(tier);
      }
      
      // Update message count and reset time
      if (usage.daily_message_count !== undefined) {
        setMessageCount(usage.daily_message_count);
      }
      
      if (usage.next_reset_time) {
        const resetTime = new Date(usage.next_reset_time);
        const now = new Date();
        
        if (resetTime.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
          // Less than 24 hours away
          setNextResetTime(`at ${resetTime.toLocaleTimeString()}`);
        } else {
          setNextResetTime(`tomorrow at midnight`);
        }
      }
    } catch (error) {
      console.error('Failed to check subscription:', error);
    }
  };

  const loadDocuments = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/documents/list`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };

  const handleDocumentProcessed = (documentId: string) => {
    setSelectedDocument(documentId);
    loadDocuments();
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background p-6 theme-transition">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold">Chat Dashboard</h1>
              <ThemeSwitch />
            </div>
            <div className="flex items-center gap-4">
              {user && (
                <span className="text-sm text-muted-foreground">
                  {user.email}
                </span>
              )}
              <Button 
                onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                variant="outline"
              >
                Logout
              </Button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <ChatInterface 
                userTier={userTier}
                messageCount={messageCount}
                maxDailyMessages={500}
                nextResetTime={nextResetTime}
              />
            </div>
            
            
              
              
              {documents.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Documents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {documents.slice(0, 5).map((doc) => (
                        <div key={doc.id} className="text-sm p-2 rounded hover:bg-muted cursor-pointer">
                          <div className="font-medium truncate">{doc.filename}</div>
                          <div className="text-xs text-muted-foreground">
                            {(doc.text_length / 1000).toFixed(1)}k chars • {new Date(doc.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}