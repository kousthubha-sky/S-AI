// routes/dashboard.tsx
import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { ProtectedRoute } from "~/components/protected-route";
import { Button } from "~/components/ui/button";
import { ThemeSwitch } from "~/components/theme/theme-switch";
import { ChatInterface } from "~/components/chat/chat-interface";

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
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<string>("");

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/documents/list', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
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
              <ChatInterface />
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