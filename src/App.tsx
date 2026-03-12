import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import XPFloatLayer from "@/components/effects/XPFloatLayer";
import BootSequence from "@/components/effects/BootSequence";
import LevelUpAnimation from "@/components/effects/LevelUpAnimation";

const App = () => {
  const [booted, setBooted] = useState(false);

  return (
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
  );
};

export default App;