import { motion, animate } from "framer-motion";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { WifiIcon } from "lucide-react";
import EmotionRange from "@/components/ui/EmotionRange";
import EmotionTimelineBar from "@/components/ui/EmotionTimelineBar";

const BloodFlowActivity = () => {
  const [selectedActivity, setSelectedActivity] = useState<string>("working");
  const [selectedLocation, setSelectedLocation] = useState<string>("office");
  const [flowIntensity, setFlowIntensity] = useState(0);
  const [heartRate, setHeartRate] = useState(75); // Default heart rate
  const isConnected = true;
  const [displayMode, setDisplayMode] = useState<'emotion-timeline'>('emotion-range');

  // Calculate derived emotion values for RGB representation
  const getFrustratedValue = () => Math.min(100, Math.max(0, 
    // Higher frustration when flow is low and heart rate is high
    flowIntensity < 40 && heartRate > 75 ? 80 : flowIntensity < 30 ? 70 : 30
  ));
  
  const getExcitedValue = () => Math.min(100, Math.max(0, 
    // Higher excitement when flow is high and heart rate is high
    flowIntensity > 70 && heartRate > 80 ? 90 : flowIntensity > 60 ? 75 : 40
  ));
  
  const getCalmValue = () => Math.min(100, Math.max(0, 
    // Higher calmness when flow is moderate and heart rate is low
    flowIntensity > 40 && flowIntensity < 70 && heartRate < 70 ? 85 : heartRate < 65 ? 70 : 35
  ));

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
          // console.log('Most Recent Record:', data);
          const updateIntensity = Math.floor(data['flowIntensityValues'][0])
          setFlowIntensity(updateIntensity);
          
          // Update heart rate if available
          if (data['heartRateValues'] && data['heartRateValues'].length > 0) {
            setHeartRate(Math.floor(data['heartRateValues'][0]));
          } else {
            // Generate random heart rate if not available
            setHeartRate(Math.floor(Math.random() * (85 - 65) + 65)); // Random value between 65-85
          }
          
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

  // Calculate values for half circle (180 degrees)
  const radius = 70;
  const diameter = radius * 2;
  const halfCircumference = Math.PI * radius;
  const offset = halfCircumference - (flowIntensity / 100) * halfCircumference;

  return (
    <div className="p-4 border border-sidebar-border rounded-lg bg-sidebar-background/50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Blood Flow Activity</h3>
        {isConnected && (
          <div className="flex items-center gap-1 text-xs text-accent">
            <WifiIcon className="h-3 w-3" />
            <span>Connected</span>
          </div>
        )}
      </div>
      
      <div className="space-y-6">
        <div className="relative flex flex-col items-center justify-center h-32">
          <svg className="w-48 h-48">
            <path
              d={`M 26 96 A 70 70 0 0 1 166 96`}
              fill="none"
              stroke="#8a5cf6"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <motion.path
              d={`M 26 96 A 70 70 0 0 1 166 96`}
              fill="none"
              stroke="rgb(var(--accent))"
              strokeWidth="8"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ 
                pathLength: flowIntensity / 100,
                transition: { duration: 1, ease: "easeInOut" }
              }}
            />
            {/* Add tick marks for scale */}
            <line x1="26" y1="96" x2="26" y2="86" stroke="white" strokeWidth="2" />
            <line x1="96" y1="26" x2="96" y2="36" stroke="white" strokeWidth="2" />
            <line x1="166" y1="96" x2="166" y2="86" stroke="white" strokeWidth="2" />
            <text x="20" y="110" className="text-[8px] fill-muted-foreground">0</text>
            <text x="94" y="20" className="text-[8px] fill-muted-foreground">50</text>
            <text x="166" y="110" className="text-[8px] fill-muted-foreground">100</text>
          </svg>
          <div className="absolute flex flex-col items-center" style={{ top: '45%' }}>
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

        {/* Emotion Visualization */}
        <div className="border-t border-sidebar-border pt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium">Emotion Analysis</h4>
          </div>
          <EmotionTimelineBar
            flowIntensity={flowIntensity}
            heartRate={heartRate}
            frustratedValue={getFrustratedValue()}
            excitedValue={getExcitedValue()}
            calmValue={getCalmValue()}
            historySize={10}
            updateInterval={3000}
          />
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

export default BloodFlowActivity;
