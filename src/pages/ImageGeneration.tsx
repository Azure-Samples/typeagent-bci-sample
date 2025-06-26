import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Image as ImageIcon, Download, RefreshCw, Calendar as CalendarIcon, Clock } from "lucide-react";
import DynamicSidebar from "@/components/DynamicSidebar";
import EmotionAvatar from "@/components/ui/EmotionAvatar";
import { Calendar } from "@/components/ui/calendar";
import EmotionTimeline from "@/components/ui/EmotionTimeline";
import { TimePicker } from "@/components/ui/TimePicker";

interface BrainState {
  flowIntensity: number;
  heartRate: number;
  emotionalState: string;
  frustratedValue: number;
  excitedValue: number;
  calmValue: number;
}

const ImageGeneration = () => {
  const [brainState, setBrainState] = useState<BrainState>({
    flowIntensity: 0,
    heartRate: 75,
    emotionalState: "neutral",
    frustratedValue: 30,
    excitedValue: 40,
    calmValue: 35
  });
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState({ hour: 2, minute: 0 }); // Default to 2 AM REM sleep
  const [timelineData, setTimelineData] = useState<Array<{
    timestamp: string;
    flowValue: number;
    heartRateValue: number;
    frustratedValue: number;
    excitedValue: number;
    calmValue: number;
  }>>([]);
  
  const [userPrompt, setUserPrompt] = useState("");
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>("/brain-multiverse-example.png");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationHistory, setGenerationHistory] = useState<Array<{
    prompt: string;
    imageUrl: string;
    timestamp: number;
    brainState: BrainState;
  }>>([]);

  useEffect(() => {
    const fetchTimelineData = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/getFlowIntensityData', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.flowIntensityData && Array.isArray(data.flowIntensityData)) {
            const formattedData = data.flowIntensityData.map((item: any) => ({
              timestamp: item.timestamp || new Date().toISOString(),
              flowValue: item.flowIntensity || Math.floor(Math.random() * (85 - 15) + 15),
              heartRateValue: item.heartRate || Math.floor(Math.random() * (85 - 65) + 65),
              frustratedValue: Math.floor(Math.random() * 40 + 20),
              excitedValue: Math.floor(Math.random() * 40 + 30),
              calmValue: Math.floor(Math.random() * 40 + 25)
            }));
            setTimelineData(formattedData);
          }
        }
      } catch (error) {
        console.error('Error fetching timeline data:', error);
        const mockData = Array.from({ length: 24 }, (_, i) => ({
          timestamp: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString(),
          flowValue: Math.floor(Math.random() * (85 - 15) + 15),
          heartRateValue: Math.floor(Math.random() * (85 - 65) + 65),
          frustratedValue: Math.floor(Math.random() * 40 + 20),
          excitedValue: Math.floor(Math.random() * 40 + 30),
          calmValue: Math.floor(Math.random() * 40 + 25)
        }));
        setTimelineData(mockData);
      }
    };

    fetchTimelineData();
    const interval = setInterval(fetchTimelineData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedDate && timelineData.length > 0) {
      const timeSpecificData = timelineData.filter(point => {
        const pointDate = new Date(point.timestamp);
        const pointHour = pointDate.getHours();
        const pointMinute = pointDate.getMinutes();
        
        return pointDate.toDateString() === selectedDate.toDateString() &&
               pointHour === selectedTime.hour &&
               Math.abs(pointMinute - selectedTime.minute) <= 15;
      });
      
      if (timeSpecificData.length > 0) {
        const avgFlow = timeSpecificData.reduce((sum, point) => sum + point.flowValue, 0) / timeSpecificData.length;
        const avgHeartRate = timeSpecificData.reduce((sum, point) => sum + point.heartRateValue, 0) / timeSpecificData.length;
        const avgFrustrated = timeSpecificData.reduce((sum, point) => sum + point.frustratedValue, 0) / timeSpecificData.length;
        const avgExcited = timeSpecificData.reduce((sum, point) => sum + point.excitedValue, 0) / timeSpecificData.length;
        const avgCalm = timeSpecificData.reduce((sum, point) => sum + point.calmValue, 0) / timeSpecificData.length;
        
        setBrainState({
          flowIntensity: Math.round(avgFlow),
          heartRate: Math.round(avgHeartRate),
          emotionalState: avgCalm > Math.max(avgFrustrated, avgExcited) ? "calm" : 
                         avgExcited > avgFrustrated ? "excited" : "frustrated",
          frustratedValue: Math.round(avgFrustrated),
          excitedValue: Math.round(avgExcited),
          calmValue: Math.round(avgCalm)
        });
      }
    }
  }, [selectedDate, selectedTime, timelineData]);

  const generateImage = async () => {
    if (!userPrompt.trim()) {
      setError("Please enter a prompt for image generation");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3000/api/image-generation', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          parameters: {
            userPrompt: userPrompt.trim(),
            brainState: brainState
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to generate image: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.imageUrl) {
        setGeneratedImageUrl(data.imageUrl);
        setGenerationHistory(prev => [{
          prompt: userPrompt,
          imageUrl: data.imageUrl,
          timestamp: Date.now(),
          brainState: { ...brainState }
        }, ...prev.slice(0, 4)]); // Keep last 5 generations
      } else {
        throw new Error("No image URL received from server");
      }
    } catch (error) {
      console.error('Error generating image:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = async () => {
    if (!generatedImageUrl) return;
    
    try {
      const response = await fetch(generatedImageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `brain-state-image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      <DynamicSidebar />
      <main className="flex-1 p-6 neural-bg">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Brain State Image Generation</h1>
            <p className="text-lg text-muted-foreground">
              Generate AI images based on your current brain activity and emotional state
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Time Picker with Mood Overlay */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Select Date & Time
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Time</label>
                  <TimePicker
                    defaultHour={2}
                    defaultMinute={0}
                    onChange={(hour, minute) => setSelectedTime({ hour, minute })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Default: 2:00 AM (REM sleep period for dream state visualization)
                  </p>
                </div>
                
                {selectedDate && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Clock className="h-4 w-4" />
                      Brain Activity for {selectedDate.toLocaleDateString()} at {selectedTime.hour}:{selectedTime.minute.toString().padStart(2, '0')}
                    </div>
                    
                    <div className="border rounded-lg p-2 bg-sidebar-background/30">
                      <EmotionTimeline 
                        timePoints={timelineData.filter(point => {
                          const pointDate = new Date(point.timestamp);
                          const pointHour = pointDate.getHours();
                          const pointMinute = pointDate.getMinutes();
                          
                          return pointDate.toDateString() === selectedDate.toDateString() &&
                                 pointHour === selectedTime.hour &&
                                 Math.abs(pointMinute - selectedTime.minute) <= 15; // Show ±15 minutes around selected time
                        })}
                        width={280}
                      />
                    </div>
                    
                    <div className="text-xs text-muted-foreground text-center">
                      Click on timeline segments to select specific time periods for image generation
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Image Generation Interface */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Generate Image
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="prompt" className="text-sm font-medium">
                    Image Prompt
                  </label>
                  <Textarea
                    id="prompt"
                    placeholder="Describe your brain state during a certain time e.g. 'Running around a circle in multiverse'..."
                    value={userPrompt}
                    onChange={(e) => setUserPrompt(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your selected time period's brain state will automatically be incorporated into the generation prompt
                  </p>
                </div>

                <Button 
                  onClick={generateImage} 
                  disabled={isGenerating || !userPrompt.trim()}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Image...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="mr-2 h-4 w-4" />
                      Generate Image
                    </>
                  )}
                </Button>

                {error && (
                  <div className="p-3 border border-red-200 bg-red-50 text-red-700 rounded-md text-sm">
                    {error}
                  </div>
                )}

                {/* Generated Image Display */}
                {generatedImageUrl && (
                  <div className="space-y-3">
                    <div className="relative">
                      <img
                        src={generatedImageUrl}
                        alt="Generated based on brain state"
                        className="w-full rounded-lg border border-sidebar-border"
                        onError={() => setError("Failed to load generated image")}
                      />
                    </div>
                    <Button
                      onClick={downloadImage}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Image
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Generation History */}
          {generationHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Generations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {generationHistory.map((item, index) => (
                    <div key={index} className="space-y-2">
                      <img
                        src={item.imageUrl}
                        alt={`Generated: ${item.prompt}`}
                        className="w-full h-32 object-cover rounded-lg border border-sidebar-border"
                      />
                      <div className="text-xs text-muted-foreground">
                        <div className="truncate">{item.prompt}</div>
                        <div>Flow: {item.brainState.flowIntensity}% | HR: {item.brainState.heartRate} BPM</div>
                        <div>{new Date(item.timestamp).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default ImageGeneration;
