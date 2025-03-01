import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { toast, useToast } from "@/hooks/use-toast";
import DynamicSidebar from "@/components/DynamicSidebar";
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import osmtogeojson from 'osmtogeojson';
import { format } from 'date-fns';
import 'azure-maps-control'; // Import Azure Maps
import * as atlas from 'azure-maps-control'; // Import Azure Maps SDK

interface StrokeData {
  id: string;
  timestamp: string;
  club: string;
  distance: number;
  proximity: number;
  mentalExercise: string;
  start: L.LatLng;
  actualEnd: L.LatLng;
  intendedEnd: L.LatLng;
  error: number; // in yards
}

interface DataPoint {
  timestamp: string;
  flowIntensity: number;
  heartRate: number;
}

var exampleStrokes: StrokeData[] = [
  {
    id: "1",
    timestamp: "2025-02-09T13:00:00Z",
    club: "Driver",
    distance: 300, 
    proximity: 10,
    mentalExercise: "Deep Breathing",
    start: L.latLng(33.49927, -82.02238),
    actualEnd: L.latLng(33.50095, -82.02306),
    intendedEnd: L.latLng(33.50090, -82.02300),
    error: 10
  },
  {
    id: "2",
    timestamp: "2025-02-09T13:10:00Z",
    club: "Driver",
    distance: 200,
    proximity: 10,
    mentalExercise: "Visual Meditation",
    start: L.latLng(33.50095, -82.02306),
    actualEnd: L.latLng(33.50259, -82.02345),
    intendedEnd: L.latLng(33.50265, -82.02340),
    error: 10
  },
  {
    id: "3",
    timestamp: "2025-02-09T13:15:00Z",
    club: "Iron",
    distance: 150,
    proximity: 5,
    mentalExercise: "Memory Recall",
    start: L.latLng(33.50259, -82.02345),
    actualEnd: L.latLng(33.50356, -82.02348),
    intendedEnd: L.latLng(33.50350, -82.02340),
    error: 5
  },
  {
    id: "4",
    timestamp: "2025-02-09T13:35:00Z",
    club: "Iron",
    distance: 20,
    proximity: 1,
    mentalExercise: "Focus Exercise",
    start: L.latLng(33.50356, -82.02348),
    actualEnd: L.latLng(33.50377, -82.02372),
    intendedEnd: L.latLng(33.50370, -82.02370),
    error: 1
  },
  {
    id: "5",
    timestamp: "2025-02-09T13:52:00Z",
    club: "Putter",
    distance: 10,
    proximity: 0,
    mentalExercise: "Calm Breathing",
    start: L.latLng(33.50377, -82.02372),
    actualEnd: L.latLng(33.50378, -82.02378),
    intendedEnd: L.latLng(33.50378, -82.02378),
    error: 0
  }
];

// Replace 'YOUR_AZURE_MAPS_SUBSCRIPTION_KEY' with your actual Azure Maps subscription key
const AZURE_MAPS_SUBSCRIPTION_KEY = "rA1YINESC35rbFB0KSR0Za13OxwOdQuaeaOC0oJGkajZGDERhUURJQQJ99BBACYeBjFZrzWBAAAgAZMPT736 ";

const fetchStrokeData = async (strokeId: string, strokeTimestamp: string): Promise<{ data: DataPoint[], strokeTime: string }> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const startHeartRate = Math.floor(Math.random() * 51) + 50; // Random number between 50 and 100
      const endHeartRate = Math.floor(Math.random() * 51) + 50; // Random number between 50 and 100
      const startFlowIntensity = Math.floor(Math.random() * 51) + 50; // Random number between 50 and 100
      const endFlowIntensity = Math.floor(Math.random() * 51) + 50; // Random number between 50 and 100

      const strokeTimeIndex = 30; // Assume the stroke happens at the midpoint
      const strokeTime = new Date(new Date(strokeTimestamp).getTime() + strokeTimeIndex * 1000).toISOString();

      const data: DataPoint[] = Array.from({ length: 60 }, (_, i) => {
        const timeFactor = i / 10; // Adjust this factor to change the frequency of the sine wave

        // Calculate flowIntensity with constraints
        let flowIntensity = startFlowIntensity + (endFlowIntensity - startFlowIntensity) * (i / 59) + 20 * Math.sin(timeFactor) + 2.5 * Math.pow(timeFactor, 2);
        flowIntensity = Math.min(flowIntensity, 240); // Ensure flowIntensity does not exceed 240

        // Calculate heartRate with constraints
        let heartRate = startHeartRate + (endHeartRate - startHeartRate) * (i / 59) + 15 * Math.sin(timeFactor + Math.PI / 4) + 1.5 * Math.pow(timeFactor, 2);
        heartRate = Math.min(heartRate, 150); // Ensure heartRate does not exceed 120

        return {
          timestamp: new Date(new Date(strokeTimestamp).getTime() + i * 1000).toISOString(),
          flowIntensity: Math.round(flowIntensity),
          heartRate: Math.round(heartRate),
        };
      });
      resolve({ data, strokeTime });
    }, 1000);
  });
};

const GolfAnalysis = () => {
  const [selectedStroke, setSelectedStroke] = useState<StrokeData | null>(null);
  const [strokeData, setStrokeData] = useState<DataPoint[]>([]);
  const [strokeTime, setStrokeTime] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [club, setClub] = useState("Driver");
  const [distance, setDistance] = useState(250);
  const [proximity, setProximity] = useState(10);
  const [mentalExercise, setMentalExercise] = useState("Deep Breathing");

  const [selectedStrokeDetails, setSelectedStrokeDetails] = useState<string | null>(null);
  const [selectedStrokeId, setSelectedStrokeId] = useState<string | null>(null);
  const mapInitialized = useRef(false); // Ref to track map initialization

  // Automatically load the first stroke when the component mounts
  useEffect(() => {
    if (exampleStrokes.length > 0) {
        setSelectedStroke(exampleStrokes[0]);
    }
    if (selectedStroke) {
      setIsLoading(true);
      fetchStrokeData(selectedStroke.id, selectedStroke.timestamp)
        .then(({ data, strokeTime }) => {
          setStrokeData(data);
          setStrokeTime(strokeTime);
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Error fetching stroke data:', error);
          toast({
            title: "Error",
            description: "Failed to fetch stroke data",
            variant: "destructive",
          });
          setIsLoading(false);
        });

      // Update controls based on the selected stroke
      setClub(selectedStroke.club);
      setDistance(selectedStroke.distance);
      setProximity(selectedStroke.proximity);
      setMentalExercise(selectedStroke.mentalExercise);
    }
  }, [selectedStroke]);

  // Calculate changes in heart rate and flow intensity after the stroke event
  const calculateChanges = () => {
    if (!strokeTime || strokeData.length === 0) return { heartRateChange: 0, flowIntensityChange: 0 };

    const strokeIndex = strokeData.findIndex(dataPoint => dataPoint.timestamp === strokeTime);
    if (strokeIndex === -1 || strokeIndex >= strokeData.length - 1) return { heartRateChange: 0, flowIntensityChange: 0 };

    const preStroke = strokeData[strokeIndex];
    const postStroke = strokeData[strokeIndex + 20];

    const heartRateChange = postStroke.heartRate - preStroke.heartRate;
    const flowIntensityChange = postStroke.flowIntensity - preStroke.flowIntensity;

    return { heartRateChange, flowIntensityChange };
  };

  const { heartRateChange, flowIntensityChange } = calculateChanges();

  const updateStrokeRecord = () => {
    if (selectedStroke) {
      const updatedStroke = {
        ...selectedStroke,
        club,
        distance,
        proximity,
        mentalExercise
      };
      console.log("Updated Stroke Record:", updatedStroke);
      // Update the exampleStrokes array
      exampleStrokes = exampleStrokes.map(stroke =>
        stroke.id === selectedStroke.id ? updatedStroke : stroke
      );
      toast({
        title: "Success",
        description: "Stroke record updated successfully",
        variant: "default",
      });
    }
  };

  const startAddingStroke = () => {
    // Logic to start adding a stroke
    alert('Click on the map to set the start, actual end, and intended end points.');
    // Additional logic to handle stroke addition can be added here
  };

  // Initialize the map
  // Fetch Azure Maps token and initialize the map
  useEffect(() => {
    if (mapInitialized.current) return; // Prevent re-initialization

    const initializeMap = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/getAzureMapsToken');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const { token } = await response.json();

        const map = new atlas.Map('map', {
          center: [-82.02536, 33.49841],
          zoom: 15,
          view: 'Auto',
          enableAccessibility: false,
          authOptions: {
            authType: atlas.AuthenticationType.subscriptionKey,
            subscriptionKey: token
          },
          showLogo: false, // Hide the Azure Maps logo
          showFeedbackLink: false, // Hide the feedback link
          showMapState: false, // Hide the map state controls
          showLabels: false, // Hide the scale
          showTileBoundaries: false,
          showScale: false,
          showZoomControl: false,
          showCompass: false,
          showTraffic: false
        });

        map.events.add('ready', function () {
          // Fetch and convert GeoJSON data
          const bbox = '33.45,-82.07,33.53,-81.99';
          const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];(way["golf"](${bbox});relation["golf"](${bbox}););out geom;`;
          fetch(overpassUrl)
            .then(response => {
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              return response.json();
            })
            .then(data => {
              const geojson = osmtogeojson(data);

              // Validate and add GeoJSON to Azure Maps DataSource
              if (geojson.type === 'FeatureCollection') {
                const dataSource = new atlas.source.DataSource();
                map.sources.add(dataSource);
                dataSource.add(geojson as any);

                // Add a polygon layer for the golf course
                const polygonLayer = new atlas.layer.PolygonLayer(dataSource, null, {
                  fillColor: ['match', ['get', 'golf'],
                    'fairway', 'green',
                    'green', 'lightgreen',
                    'lateral_water_hazard', 'blue',
                    'water_hazard', 'blue',
                    'water', 'blue',
                    'bunker', 'yellow',
                    'rough', 'brown',
                    'tee', 'gray',
                    // 'hole', 'black', -> LineString
                    // 'cartpath', 'gray', -> LineString
                    // 'path', 'gray', -> LineString
                    'transparent' // default
                  ],
                  fillOpacity: 0.2
                });
                map.layers.add(polygonLayer);

                // Fit map to the bounds of the data
                const bounds = atlas.data.BoundingBox.fromData(geojson as any);
                map.setCamera({
                  bounds: bounds,
                  padding: 20
                });
              }
            })
            .catch(error => console.error('Error fetching golf course data:', error));

          // Add predefined strokes to the map
          exampleStrokes.forEach(stroke => {
            // Calculate distance and error in yards
            stroke.distance = stroke.start.distanceTo(stroke.actualEnd) * 1.09361;
            stroke.error = stroke.actualEnd.distanceTo(stroke.intendedEnd) * 1.09361;

            // Define a thin rectangle around the line to create a polygon
            const lineWidth = 0.00001; // Adjust this value to change the width of the polygon
            const start = stroke.start;
            const end = stroke.actualEnd;

            // Calculate the direction vector
            const dx = end.lng - start.lng;
            const dy = end.lat - start.lat;

            // Calculate perpendicular vector for width
            const length = Math.sqrt(dx * dx + dy * dy);
            const ux = -dy / length * lineWidth;
            const uy = dx / length * lineWidth;

            // Define the polygon coordinates
            const linePolygonCoordinates = [
              [start.lng + ux, start.lat + uy],
              [end.lng + ux, end.lat + uy],
              [end.lng - ux, end.lat - uy],
              [start.lng - ux, start.lat - uy],
              [start.lng + ux, start.lat + uy] // Close the polygon
            ];

            const linePolygon = new atlas.data.Polygon([linePolygonCoordinates]);
            const linePolygonDataSource = new atlas.source.DataSource();
            map.sources.add(linePolygonDataSource);
            linePolygonDataSource.add(linePolygon);

            const linePolygonLayer = new atlas.layer.PolygonLayer(linePolygonDataSource, null, {
              fillColor: 'rgba(0, 0, 255, 0.5)', // Semi-transparent blue
              strokeColor: 'blue',
              strokeWidth: 1
            });
            map.layers.add(linePolygonLayer);

            // Create a star-shaped polygon around the start position
            const outerRadiusInMeters = 3; // Increase the outer radius for a larger star
            const innerRadiusInMeters = 1.5; // Increase the inner radius proportionally
            const numPoints = 5; // Number of points in the star

            const starCoordinates = [];
            const earthRadius = 6378137; // Earth's radius in meters

            for (let i = 0; i < numPoints * 2; i++) {
              const angle = (i / (numPoints * 2)) * Math.PI * 2;
              const radius = i % 2 === 0 ? outerRadiusInMeters : innerRadiusInMeters;
              const dx = radius * Math.cos(angle);
              const dy = radius * Math.sin(angle);

              // Calculate new latitude and longitude
              const newLat = stroke.start.lat + (dy / earthRadius) * (180 / Math.PI);
              const newLng = stroke.start.lng + (dx / (earthRadius * Math.cos(Math.PI * stroke.start.lat / 180))) * (180 / Math.PI);

              const point = new atlas.data.Position(newLng, newLat);
              starCoordinates.push(point);
            }
            starCoordinates.push(starCoordinates[0]); // Close the star shape

            const starPolygon = new atlas.data.Polygon([starCoordinates]);
            const starDataSource = new atlas.source.DataSource();
            map.sources.add(starDataSource);
            starDataSource.add(starPolygon);

            const starLayer = new atlas.layer.PolygonLayer(starDataSource, null, {
              fillColor: 'rgba(0, 0, 0, 0.8)', // Bright yellow with some transparency
              strokeColor: 'black', // Black stroke for high contrast
              strokeWidth: 3 // Thicker stroke for better visibility
            });
            map.layers.add(starLayer);

            // Add click event to the star layer
            map.events.add('click', starLayer, () => {
              setSelectedStrokeId(stroke.id);
              setSelectedStrokeDetails(`
                Club: ${stroke.club}
                Distance: ${stroke.distance.toFixed(0)} yards
                Error: ${stroke.error.toFixed(0)} yards
              `);
            });
          });
        });

        mapInitialized.current = true; // Mark map as initialized
      } catch (error) {
        console.error('Error loading Azure Maps:', error);
        toast({
          title: "Error",
          description: "Failed to load Azure Maps",
          variant: "destructive",
        });
      }
    };

    initializeMap();
  }, []); // Empty dependency array to run only once

  const minFlowIntensity = Math.min(...strokeData.map(d => d.flowIntensity));
  const maxFlowIntensity = Math.max(...strokeData.map(d => d.flowIntensity));
  const minHeartRate = Math.min(...strokeData.map(d => d.heartRate));
  const maxHeartRate = Math.max(...strokeData.map(d => d.heartRate));

  const yAxisDomain = [
    Math.min(minFlowIntensity, minHeartRate) - 5, // Add some padding
    Math.max(maxFlowIntensity, maxHeartRate) + 5  // Add some padding
  ];

  return (
    <div className="flex min-h-screen w-full">
      <DynamicSidebar />
      
      <main className="flex-1 neural-bg">
        <div className="flex h-screen flex-col p-6">
          <div className="mb-4">
            <h1 className="text-2xl font-bold">Golf Stroke Analysis</h1>
            <p className="text-muted-foreground">Analyze flow intensity and heart rate around golf strokes</p>
          </div>

          <ScrollArea className="flex-1 rounded-lg border border-sidebar-border bg-background/50 p-4">
            <div className="space-y-6">
              <div className="flex space-x-4">
                <div className="flex-1 space-y-4">
                  <Select
                    value={selectedStroke?.id || ""}
                    onValueChange={(value: string) => {
                      const stroke = exampleStrokes.find(s => s.id === value);
                      setSelectedStroke(stroke || null);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a stroke to analyze" />
                    </SelectTrigger>
                    <SelectContent>
                      {exampleStrokes.map(stroke => (
                        <SelectItem key={stroke.id} value={stroke.id}>
                          {`Stroke on ${new Date(stroke.timestamp).toLocaleString()} with ${stroke.club}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedStroke && (
                    <div className="p-4 bg-accent/10 rounded-lg">
                      <h3 className="font-medium mb-2">Stroke Details</h3>
                      <p>Club: {selectedStroke.club}</p>
                      <p>Distance: {selectedStroke.distance.toFixed(0)} yards</p>
                      <p>Proximity to Target: {selectedStroke.proximity} feet</p>
                      <p>Mental Exercise: {selectedStroke.mentalExercise}</p>
                    </div>
                  )}

                  <div className="flex space-x-4">
                    <Button 
                      onClick={() => setClub("Putter")}
                      className={`flex-1 ${club === "Putter" ? "bg-accent" : "bg-background"}`}
                    >
                      Putter
                    </Button>
                    <Button 
                      onClick={() => setClub("Iron")}
                      className={`flex-1 ${club === "Iron" ? "bg-accent" : "bg-background"}`}
                    >
                      Iron
                    </Button>
                    <Button 
                      onClick={() => setClub("Driver")}
                      className={`flex-1 ${club === "Driver" ? "bg-accent" : "bg-background"}`}
                    >
                      Driver
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-muted-foreground">Distance (yards)</label>
                    <Slider 
                      value={distance} 
                      onChange={(value: number) => setDistance(value)} 
                      min={0} 
                      max={300} 
                      step={1} 
                      trackStyle={{ backgroundColor: '#8884d8' }}
                      handleStyle={{ borderColor: '#8884d8' }}
                    />
                    <p className="text-sm text-muted-foreground">{Math.round(distance)} yards</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-muted-foreground">Proximity to Target (feet)</label>
                    <Slider 
                      value={proximity} 
                      onChange={(value: number) => setProximity(value)} 
                      min={0} 
                      max={50} 
                      step={1} 
                      trackStyle={{ backgroundColor: '#8884d8' }}
                      handleStyle={{ borderColor: '#8884d8' }}
                    />
                    <p className="text-sm text-muted-foreground">{proximity} feet</p>
                  </div>

                  <Select
                    value={mentalExercise}
                    onValueChange={setMentalExercise}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a mental exercise" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Deep Breathing">Deep Breathing</SelectItem>
                      <SelectItem value="Visual Meditation">Visual Meditation</SelectItem>
                      <SelectItem value="Memory Recall">Memory Recall</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button 
                    onClick={updateStrokeRecord}
                    className="w-full bg-accent hover:bg-accent/80 mt-4"
                  >
                    Confirm Update
                  </Button>

                  {/* <Button 
                    onClick={startAddingStroke}
                    className="w-full bg-accent hover:bg-accent/80 mb-4"
                  >
                    Add Stroke
                  </Button> */}
                </div>

                <div className="flex-1 h-[450px]">
                  <div className="mt-4 p-4 bg-accent/10 rounded-lg">
                    <h3 className="font-medium mb-2">Post-Stroke Analysis:</h3>
                    <p>Change in Heart Rate: {heartRateChange} bpm</p>
                    <p>Change in Flow Intensity: {flowIntensityChange}</p>
                  </div>

                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={strokeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()}
                      />
                      <YAxis domain={yAxisDomain} />
                      <Tooltip />
                      <Legend />
                      {strokeTime && (
                        <ReferenceLine 
                          x={strokeTime} 
                          stroke="red" 
                          label={{
                            position: 'bottom',
                            value: 'Stroke Event',
                            fill: 'red',
                            fontSize: 12,
                            fontWeight: 'bold',
                          }}
                        />
                      )}
                      <Line 
                        type="monotone" 
                        name="Flow Intensity (%)"
                        dataKey="flowIntensity" 
                        stroke="rgb(147, 51, 234)" // Purple
                        strokeWidth={2}
                        dot={{ fill: "rgb(147, 51, 234)" }}
                      />
                      <Line 
                        type="monotone" 
                        name="Heart Rate (bpm)"
                        dataKey="heartRate" 
                        stroke="rgb(239, 68, 68)" // Red
                        strokeWidth={2}
                        dot={{ fill: "rgb(239, 68, 68)" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {selectedStrokeDetails && (
                <div className="p-4 bg-accent/10 rounded-lg">
                  <h3 className="font-medium mb-2">Stroke Details:</h3>
                  <p>{selectedStrokeDetails}</p>
                </div>
              )}

              <div className="h-[400px] w-full">
                <div id="map" style={{ height: '100%', width: '100%' }}></div>
              </div>

            </div>
          </ScrollArea>
        </div>
      </main>
    </div>
  );
};

export default GolfAnalysis;