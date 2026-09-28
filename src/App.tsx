import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import HabitStats from "./pages/HabitStats.tsx";
import GroupStats from "./pages/GroupStats.tsx";
import ExportData from "./pages/ExportData.tsx";
import { useAutoBackup } from "@/lib/use-auto-backup";

const queryClient = new QueryClient();

const App = () => {
  useAutoBackup();
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/habit/:id" element={<HabitStats />} />
          <Route path="/group/:id" element={<GroupStats />} />
          <Route path="/export" element={<ExportData />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
