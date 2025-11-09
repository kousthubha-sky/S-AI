// routes/dashboard.tsx
import { SidebarProvider } from "~/components/ui/sidebar";
import { ProtectedRoute } from "~/components/protected-route";
import DashboardContent from "./dashboard-content";

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <SidebarProvider defaultOpen={true}>
        <DashboardContent />
      </SidebarProvider>
    </ProtectedRoute>
  );
}