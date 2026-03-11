import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Index from "./pages/Index";
import XPFloatLayer from "@/components/effects/XPFloatLayer";
import BootSequence from "@/components/effects/BootSequence";
import LevelUpAnimation from "@/components/effects/LevelUpAnimation";

const queryClient = new QueryClient();

const App = () => {
  const [booted, setBooted] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {!booted && <BootSequence onComplete={() => setBooted(true)} />}
        <div id="app-root">
          <Index />
        </div>
        <XPFloatLayer />
        <LevelUpAnimation />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
