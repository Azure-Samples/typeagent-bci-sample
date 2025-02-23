
import { motion, animate } from "framer-motion";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { WifiIcon } from "lucide-react";

const BrainActivity = () => {
  const [selectedActivity, setSelectedActivity] = useState<string>("working");
  const [selectedLocation, setSelectedLocation] = useState<string>("office");
  const [flowIntensity, setFlowIntensity] = useState(0);
  const isConnected = true;

  // Periodically update flow intensity
  useEffect(() => {
    const interval = setInterval(() => {
      fetch('http://localhost:3000/api/getMostRecentRecord', {
          method: 'POST',
          credentials: 'include', // Add this if you enabled credentials in corsOptions
          headers: {
            'Content-Type': 'application/json'
          }
        })
        .then(response => response.json())
        .then(data => {
          console.log('Most Recent Record:', data);
          const updateIntensity = Math.floor(data['flowIntensityValues'][0])
          setFlowIntensity(updateIntensity);
          //no intensity data, generate random intensity
          if (updateIntensity === 0) {
            const newIntensity = Math.floor(Math.random() * (85 - 15) + 15); // Random value between 15-85
            setFlowIntensity(newIntensity);
          }
        })
        .catch(error => { 
          console.error('Error fetching most recent record:', error);
        });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const circumference = 2 * Math.PI * 120;
  const offset = circumference - (flowIntensity / 100) * circumference;

  return (
    <div className="p-4 border border-sidebar-border rounded-lg bg-sidebar-background/50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Brain Activity Monitor</h3>
        {isConnected && (
          <div className="flex items-center gap-1 text-xs text-accent">
            <WifiIcon className="h-3 w-3" />
            <span>Connected</span>
          </div>
        )}
      </div>
      
      <div className="space-y-6">
        <div className="relative flex flex-col items-center justify-center h-48">
          <svg className="transform -rotate-90 w-48 h-48">
            <circle
              cx="96"
              cy="96"
              r="70"
              fill="none"
              stroke="rgb(var(--muted))"
              strokeWidth="8"
            />
            <motion.circle
              cx="96"
              cy="96"
              r="70"
              fill="none"
              stroke="rgb(var(--accent))"
              strokeWidth="8"
              strokeLinecap="round"
              initial={{ strokeDashoffset: circumference }}
              animate={{ 
                strokeDashoffset: offset,
                transition: { duration: 1, ease: "easeInOut" }
              }}
              style={{
                strokeDasharray: circumference
              }}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <motion.span 
              className="text-4xl font-bold text-accent"
              key={flowIntensity}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {flowIntensity}%
            </motion.span>
            <span className="text-sm text-muted-foreground">flow intensity</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="text-xs text-muted-foreground mb-2">Activity Context</div>
          <div className="grid grid-cols-2 gap-2">
            {["meeting", "working", "talking", "phone"].map((activity) => (
              <Button
                key={activity}
                variant={selectedActivity === activity ? "default" : "outline"}
                size="sm"
                className="w-full capitalize"
                onClick={() => setSelectedActivity(activity)}
              >
                {activity}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="text-xs text-muted-foreground mb-2">Location Context</div>
          <div className="grid grid-cols-2 gap-2">
            {["home", "office", "gym", "outdoor"].map((location) => (
              <Button
                key={location}
                variant={selectedLocation === location ? "default" : "outline"}
                size="sm"
                className="w-full capitalize"
                onClick={() => setSelectedLocation(location)}
              >
                {location}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 border border-sidebar-border rounded bg-sidebar-background/50">
            <div className="text-muted-foreground">Focus Level</div>
            <div className="text-accent font-medium">High</div>
          </div>
          <div className="p-2 border border-sidebar-border rounded bg-sidebar-background/50">
            <div className="text-muted-foreground">Stress Level</div>
            <div className="text-yellow-400 font-medium">Medium</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrainActivity;
