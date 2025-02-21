
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Chat from "./pages/Chat";
import DataAnalysis from "./pages/DataAnalysis";
import ReportGenerator from "./pages/ReportGenerator";
import MindfulnessMeditation from "./pages/MindfulnessMeditation";
import TaskAutomation from "./pages/TaskAutomation";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/data-analysis" element={<DataAnalysis />} />
          <Route path="/report-generator" element={<ReportGenerator />} />
          <Route path="/mindfulness-meditation" element={<MindfulnessMeditation />} />
          <Route path="/task-automation" element={<TaskAutomation />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
