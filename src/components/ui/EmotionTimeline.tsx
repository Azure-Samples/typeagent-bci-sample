import React, { useMemo, useState, useRef } from 'react';
import EmotionAvatar, { EmotionState } from './EmotionAvatar';
import EmotionRange from './EmotionRange';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card, CardContent } from "@/components/ui/card";

interface TimePoint {
  timestamp: string;
  flowValue: number;
  heartRateValue: number;
  frustratedValue: number;
  excitedValue: number;
  calmValue: number;
}

interface EmotionTimelineProps {
  timePoints: TimePoint[];
  width?: number;
}

// Visualization modes
type VisualizationMode = "avatar" | "range";

// Selection state for timeline segment analysis
interface SegmentSelection {
  startHour: string | null;
  startSlot: number | null;
  endHour: string | null;
  endSlot: number | null;
}

// Average values for the selected segment
interface SegmentAverages {
  flowAverage: number;
  heartRateAverage: number;
  frustrationAverage: number;
  excitementAverage: number;
  calmAverage: number;
  pointCount: number;
  startTime: string;
  endTime: string;
}

const determineEmotion = (flowValue: number, heartRateValue: number): EmotionState => {
  // Logic to determine emotion based on flow and heart rate values
  if (flowValue > 80) {
    return heartRateValue > 85 ? "focused" : "happy";
  } else if (flowValue < 40) {
    return heartRateValue > 80 ? "stressed" : "sad";
  } else if (heartRateValue > 85) {
    return "surprised";
  }
  return "neutral";
};

const formatTime = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    console.error("Invalid date string:", dateString);
    return "Invalid time";
  }
};

const formatHour = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      hour12: true
    });
  } catch (e) {
    console.error("Invalid date string:", dateString);
    return "Invalid hour";
  }
};

// Normalize date to the hour
const normalizeToHour = (date: Date): string => {
  const normalized = new Date(date);
  normalized.setMinutes(0, 0, 0);
  return normalized.toISOString();
};

// Function to validate date strings
const isValidDateString = (dateString: string): boolean => {
  if (!dateString) return false;
  
  try {
    const date = new Date(dateString);
    // Check if the date is valid and not too far in the past or future
    return !isNaN(date.getTime()) && 
           date.getFullYear() >= 2000 &&
           date.getFullYear() <= new Date().getFullYear() + 1;
  } catch (e) {
    return false;
  }
};

// Component to render the legend for EmotionRange
const EmotionRangeLegend = () => {
  return (
    <div className="flex items-center gap-4 text-xs py-2">
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded-sm bg-red-500"></div>
        <span>Frustration</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded-sm bg-green-500"></div>
        <span>Excitement</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded-sm bg-blue-500"></div>
        <span>Calm</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded-sm" style={{ background: 'linear-gradient(to right, black, white)' }}></div>
        <span>Intensity (0-100%)</span>
      </div>
    </div>
  );
};

const EmotionTimeline: React.FC<EmotionTimelineProps> = ({ 
  timePoints, 
  width = 700
}) => {
  // Add state for visualization mode
  const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>("range");
  
  // Selection state for timeline segments
  const [selection, setSelection] = useState<SegmentSelection>({
    startHour: null,
    startSlot: null,
    endHour: null,
    endSlot: null,
  });
  
  // State for segment analysis
  const [segmentAverages, setSegmentAverages] = useState<SegmentAverages | null>(null);
  
  // State to track if we're in selection mode
  const [isSelecting, setIsSelecting] = useState<boolean>(false);
  
  // Ref to store timepoint data for segment analysis
  const timePointsRef = useRef<{ [hourKey: string]: { [slotIndex: number]: TimePoint } }>({});

  // Early validation of input data
  if (!timePoints || !Array.isArray(timePoints) || timePoints.length === 0) {
    // console.log("EmotionTimeline: No timeline data available");
    return <div className="text-center text-sm text-muted-foreground">No timeline data available</div>;
  }

  // Do all the data processing in useMemo to optimize performance and avoid re-calculations
  const { validHours, hourlyData, hasAnyValidData, hourStats } = useMemo(() => {
    // console.log(`EmotionTimeline: Starting to process ${timePoints.length} data points`);
    
    // Helper function to check if a data point is valid and has meaningful values
    const isValidDataPoint = (point: TimePoint): boolean => {
      if (!point) return false;
      
      // Ensure timestamp is valid
      if (!isValidDateString(point.timestamp)) {
        // console.log(`EmotionTimeline: Skipping point with invalid timestamp: ${point.timestamp}`);
        return false;
      }
      
      // Check if values are meaningful (not zero or very close to zero)
      const MIN_FLOW_VALUE = 5;   // Minimum threshold for flow value
      const MIN_HEART_RATE = 40;  // Minimum threshold for heart rate
      const MAX_FLOW_VALUE = 150; // Maximum realistic flow value
      const MAX_HEART_RATE = 200; // Maximum realistic heart rate
      
      // Check for default values that indicate no real data
      const DEFAULT_FLOW_VALUE = 50;
      const DEFAULT_HEART_RATE = 75;
      
      // Reject data points with exactly the default values, as these are likely placeholder data
      if (point.flowValue === DEFAULT_FLOW_VALUE && point.heartRateValue === DEFAULT_HEART_RATE) {
        // console.log(`EmotionTimeline: Rejecting point with default values: flow=${point.flowValue}, heart=${point.heartRateValue}`);
        return false;
      }
      
      // Also reject if only one value is exactly at the default
      if (point.flowValue === DEFAULT_FLOW_VALUE) {
        // console.log(`EmotionTimeline: Rejecting point with default flow value=${point.flowValue}`);
        return false;
      }
      
      if (point.heartRateValue === DEFAULT_HEART_RATE) {
        // console.log(`EmotionTimeline: Rejecting point with default heart rate=${point.heartRateValue}`);
        return false;
      }
      
      // Validate flow value is within realistic range
      if (typeof point.flowValue !== 'number' || 
          isNaN(point.flowValue) || 
          point.flowValue < MIN_FLOW_VALUE || 
          point.flowValue > MAX_FLOW_VALUE) {
        // console.log(`EmotionTimeline: Invalid flow value: ${point.flowValue}`);
        return false;
      }
      
      // Validate heart rate is within realistic range
      if (typeof point.heartRateValue !== 'number' || 
          isNaN(point.heartRateValue) || 
          point.heartRateValue < MIN_HEART_RATE || 
          point.heartRateValue > MAX_HEART_RATE) {
        // console.log(`EmotionTimeline: Invalid heart rate value: ${point.heartRateValue}`);
        return false;
      }
      
      return true;
    };
    
    // Pre-process and validate all time points
    const validPoints: TimePoint[] = [];
    
    // Log all data points for debugging
    timePoints.forEach((point, index) => {
      // console.log(`EmotionTimeline: Point ${index}: timestamp=${point.timestamp}, flow=${point.flowValue}, heart=${point.heartRateValue}`);
      
      if (isValidDataPoint(point)) {
        validPoints.push(point);
      }
    });
    
    // console.log(`EmotionTimeline: Filtered to ${validPoints.length} valid points`);
    
    // Group valid timepoints by hour
    const hourlyGroups: Record<string, TimePoint[]> = {};
    
    // Track stats for hours to log
    const hourlyStats: Record<string, { total: number, valid: number }> = {};
    
    validPoints.forEach(point => {
      try {
        const date = new Date(point.timestamp);
        const hourKey = normalizeToHour(date);
        
        // Initialize hourly stats if needed
        if (!hourlyStats[hourKey]) {
          hourlyStats[hourKey] = { total: 0, valid: 0 };
        }
        
        // Count this as a valid point
        hourlyStats[hourKey].valid++;
        hourlyStats[hourKey].total++;
        
        // Add to hourly groups for rendering
        if (!hourlyGroups[hourKey]) {
          hourlyGroups[hourKey] = [];
        }
        
        hourlyGroups[hourKey].push(point);
      } catch (e) {
        console.error("Error processing point:", point, e);
      }
    });
    
    // Get sorted list of hours that have valid data
    const sortedHours = Object.keys(hourlyGroups).sort();
    
    console.log(`EmotionTimeline: Found ${sortedHours.length} hours with valid data`);
    sortedHours.forEach(hour => {
      console.log(`EmotionTimeline: Hour ${formatHour(hour)} has ${hourlyGroups[hour].length} valid points`);
    });
    
    return {
      validHours: sortedHours,
      hourlyData: hourlyGroups,
      hasAnyValidData: sortedHours.length > 0,
      hourStats: hourlyStats
    };
  }, [timePoints]);
  
  // Calculate the appropriate avatar size based on the container width
  const avatarSize = Math.min(45, Math.floor((width - 100) / 12)); // 12 columns for 5-minute intervals per hour
  
  // If no valid hours found, display message
  if (!hasAnyValidData) {
    console.log("EmotionTimeline: No valid timeline data found");
    return <div className="text-center text-sm text-muted-foreground">No valid timeline data available</div>;
  }
  
  // Function to handle selecting a timeline cell
  const handleCellSelect = (hourKey: string, slotIndex: number) => {
    if (!isSelecting) {
      // Start selection
      setIsSelecting(true);
      setSelection({
        startHour: hourKey,
        startSlot: slotIndex,
        endHour: hourKey,
        endSlot: slotIndex
      });
      return;
    }
    
    // Complete selection
    setIsSelecting(false);
    
    // Set the end point of selection
    const updatedSelection = {
      ...selection,
      endHour: hourKey,
      endSlot: slotIndex
    };
    setSelection(updatedSelection);
    
    // Calculate averages for the selection
    calculateSegmentAverages(updatedSelection);
  };
  
  // Function to handle clearing selection
  const clearSelection = () => {
    setSelection({
      startHour: null,
      startSlot: null,
      endHour: null,
      endSlot: null
    });
    setSegmentAverages(null);
    setIsSelecting(false);
  };
  
  // Function to check if a cell is within the current selection
  const isCellSelected = (hourKey: string, slotIndex: number): boolean => {
    if (!selection.startHour || !selection.startSlot) {
      return false;
    }
    
    const allHours = validHours;
    const startHourIndex = allHours.indexOf(selection.startHour);
    const endHourIndex = selection.endHour ? allHours.indexOf(selection.endHour) : startHourIndex;
    const currentHourIndex = allHours.indexOf(hourKey);
    
    if (startHourIndex === -1 || endHourIndex === -1 || currentHourIndex === -1) {
      return false;
    }
    
    const minHourIndex = Math.min(startHourIndex, endHourIndex);
    const maxHourIndex = Math.max(startHourIndex, endHourIndex);
    
    // If hour is outside selection range
    if (currentHourIndex < minHourIndex || currentHourIndex > maxHourIndex) {
      return false;
    }
    
    // If this is the only hour in selection
    if (minHourIndex === maxHourIndex) {
      const minSlot = Math.min(selection.startSlot!, selection.endSlot || 0);
      const maxSlot = Math.max(selection.startSlot!, selection.endSlot || 0);
      return slotIndex >= minSlot && slotIndex <= maxSlot;
    }
    
    // If this is the first hour in selection
    if (currentHourIndex === minHourIndex) {
      if (minHourIndex === startHourIndex) {
        return slotIndex >= selection.startSlot!;
      } else {
        return slotIndex <= selection.startSlot!;
      }
    }
    
    // If this is the last hour in selection
    if (currentHourIndex === maxHourIndex) {
      if (maxHourIndex === startHourIndex) {
        return slotIndex <= selection.startSlot!;
      } else {
        return slotIndex >= 0;
      }
    }
    
    // If hour is in the middle of selection range
    return true;
  };
  
  // Calculate averages for the selected timeline segment
  const calculateSegmentAverages = (sel: SegmentSelection) => {
    if (!sel.startHour || !sel.startSlot || !sel.endHour || sel.endSlot === null) {
      setSegmentAverages(null);
      return;
    }
    
    const allHours = validHours;
    const startHourIndex = allHours.indexOf(sel.startHour);
    const endHourIndex = allHours.indexOf(sel.endHour);
    
    if (startHourIndex === -1 || endHourIndex === -1) {
      setSegmentAverages(null);
      return;
    }
    
    const minHourIndex = Math.min(startHourIndex, endHourIndex);
    const maxHourIndex = Math.max(startHourIndex, endHourIndex);
    
    let flowSum = 0;
    let heartRateSum = 0;
    let frustrationSum = 0;
    let excitementSum = 0;
    let calmSum = 0;
    let pointCount = 0;
    
    // For calculating time range
    let firstTimestamp: string | null = null;
    let lastTimestamp: string | null = null;
    
    // Loop through all hours in the selection
    for (let hourIdx = minHourIndex; hourIdx <= maxHourIndex; hourIdx++) {
      const hourKey = allHours[hourIdx];
      const pointsInHour = hourlyData[hourKey];
      
      if (!pointsInHour) continue;
      
      // Create a map of valid points in this hour
      const slotMap: Record<number, TimePoint> = {};
      pointsInHour.forEach(point => {
        try {
          const date = new Date(point.timestamp);
          const minutes = date.getMinutes();
          const slotIndex = Math.floor(minutes / 5);
          if (slotIndex >= 0 && slotIndex < 12) {
            slotMap[slotIndex] = point;
          }
        } catch (e) {
          console.error("Error processing point for averages:", point, e);
        }
      });
      
      // Determine which slots to include for this hour
      let minSlot = 0;
      let maxSlot = 11;
      
      if (hourIdx === minHourIndex && hourIdx === maxHourIndex) {
        // If it's the only hour, use the selected slots
        minSlot = Math.min(sel.startSlot, sel.endSlot);
        maxSlot = Math.max(sel.startSlot, sel.endSlot);
      } else if (hourIdx === minHourIndex) {
        // If it's the first hour, start from the selected slot
        if (minHourIndex === startHourIndex) {
          minSlot = sel.startSlot;
        } else {
          maxSlot = sel.startSlot;
        }
      } else if (hourIdx === maxHourIndex) {
        // If it's the last hour, end at the selected slot
        if (maxHourIndex === startHourIndex) {
          maxSlot = sel.startSlot;
        } else {
          minSlot = 0;
          maxSlot = sel.endSlot;
        }
      }
      
      // Sum up values for all points in this hour's selected slots
      for (let slotIdx = minSlot; slotIdx <= maxSlot; slotIdx++) {
        const point = slotMap[slotIdx];
        if (point) {
          // Track first and last timestamps for time range display
          if (!firstTimestamp || new Date(point.timestamp) < new Date(firstTimestamp)) {
            firstTimestamp = point.timestamp;
          }
          if (!lastTimestamp || new Date(point.timestamp) > new Date(lastTimestamp)) {
            lastTimestamp = point.timestamp;
          }
          
          flowSum += point.flowValue;
          heartRateSum += point.heartRateValue;
          frustrationSum += point.frustratedValue;
          excitementSum += point.excitedValue;
          calmSum += point.calmValue;
          pointCount++;
        }
      }
    }
    
    // Calculate averages
    if (pointCount > 0) {
      setSegmentAverages({
        flowAverage: Math.round(flowSum / pointCount),
        heartRateAverage: Math.round(heartRateSum / pointCount),
        frustrationAverage: Math.round(frustrationSum / pointCount),
        excitementAverage: Math.round(excitementSum / pointCount),
        calmAverage: Math.round(calmSum / pointCount),
        pointCount,
        startTime: firstTimestamp ? formatTime(firstTimestamp) : 'Unknown',
        endTime: lastTimestamp ? formatTime(lastTimestamp) : 'Unknown'
      });
    } else {
      setSegmentAverages(null);
    }
  };
  
  return (
    <div className="w-full overflow-auto pb-2 border rounded-md bg-accent/5">
      <div className="flex flex-col space-y-1 p-3">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-sm font-medium">
            Emotional Timeline (5-minute intervals) - {validHours.length} hours with data
          </h4>
          <ToggleGroup
            type="single"
            value={visualizationMode}
            onValueChange={(value: VisualizationMode) => {
              if (value) {
                setVisualizationMode(value);
                // Clear selection when switching modes
                clearSelection();
              }
            }}
            className="justify-end"
          >
            <ToggleGroupItem value="avatar" aria-label="Avatar View" className="text-xs px-2 py-1 h-auto">
              Avatar
            </ToggleGroupItem>
            <ToggleGroupItem value="range" aria-label="Color Range View" className="text-xs px-2 py-1 h-auto">
              Color Range
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        
        {/* Legend for EmotionRange mode */}
        {visualizationMode === "range" && (
          <div className="mb-2">
            <EmotionRangeLegend />
          </div>
        )}
        
        {/* Selection status and instructions */}
        {visualizationMode === "range" && (
          <div className="mb-2 text-xs text-muted-foreground">
            {isSelecting ? (
              <p>Click another cell to complete selection</p>
            ) : (
              selection.startHour ? (
                <div className="flex justify-between">
                  <p>Selection active. Click a cell to start a new selection.</p>
                  <button 
                    className="text-xs text-accent underline" 
                    onClick={clearSelection}
                  >
                    Clear selection
                  </button>
                </div>
              ) : (
                <p>Click a cell to select a segment for analysis</p>
              )
            )}
          </div>
        )}
        
        {/* Display segment averages if available */}
        {segmentAverages && visualizationMode === "range" && (
          <Card className="mb-2 bg-accent/10">
            <CardContent className="py-3">
              <div className="flex justify-between items-center mb-2">
                <h5 className="text-sm font-medium">Selected Segment Analysis</h5>
                <span className="text-xs text-muted-foreground">
                  {segmentAverages.startTime} - {segmentAverages.endTime}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Flow Intensity</p>
                  <p className="font-semibold">{segmentAverages.flowAverage}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Heart Rate</p>
                  <p className="font-semibold">{segmentAverages.heartRateAverage} bpm</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Frustration</p>
                  <p className="font-semibold text-red-500">{segmentAverages.frustrationAverage}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Excitement</p>
                  <p className="font-semibold text-green-500">{segmentAverages.excitementAverage}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Calm</p>
                  <p className="font-semibold text-blue-500">{segmentAverages.calmAverage}%</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Based on {segmentAverages.pointCount} data points</p>
            </CardContent>
          </Card>
        )}
        
        {/* Column headers showing 5-minute increments */}
        <div className="flex pl-20 mb-2">
          {Array(12).fill(0).map((_, i) => (
            <div 
              key={`header-${i}`} 
              className="text-xs text-center text-muted-foreground font-medium"
              style={{ width: `${avatarSize}px` }}
            >
              :{i * 5 < 10 ? `0${i * 5}` : i * 5}
            </div>
          ))}
        </div>
        
        {/* Timeline grid rows - only for hours with data */}
        <div className="space-y-1">
          {validHours.map(hourKey => {
            const pointsInHour = hourlyData[hourKey];
            
            // Create a map to place timepoints in their corresponding 5-minute slots
            const slotMap: Record<number, TimePoint> = {};
            
            pointsInHour.forEach(point => {
              try {
                const date = new Date(point.timestamp);
                const minutes = date.getMinutes();
                const slotIndex = Math.floor(minutes / 5);
                
                if (slotIndex >= 0 && slotIndex < 12) {
                  slotMap[slotIndex] = point;
                }
              } catch (e) {
                console.error("Error processing point in hour row:", point, e);
              }
            });
            
            return (
              <div key={hourKey} className="flex items-center">
                <div className="w-20 text-sm font-medium pr-2">
                  {formatHour(hourKey)}
                </div>
                
                <div className="flex">
                  {Array(12).fill(0).map((_, slotIndex) => {
                    const point = slotMap[slotIndex];
                    
                    if (!point) {
                      // Empty slot
                      return (
                        <div 
                          key={`${hourKey}-${slotIndex}`} 
                          className={`border border-dashed border-gray-200 rounded-sm opacity-30 ${visualizationMode === "range" ? "cursor-not-allowed" : ""}`}
                          style={{ width: `${avatarSize}px`, height: `${avatarSize}px` }}
                        />
                      );
                    }
                    
                    // Determine emotion state for this point
                    const emotion = determineEmotion(point.flowValue, point.heartRateValue);
                    
                    // Calculate emotion indicators for EmotionRange
                    const frustration = point.frustratedValue; 
                    const excitement = point.excitedValue;
                    const calm = point.calmValue;
                    
                    // Determine if this cell is selected (only relevant in range mode)
                    const isSelected = visualizationMode === "range" && isCellSelected(hourKey, slotIndex);
                    
                    return (
                      <div 
                        key={`${hourKey}-${slotIndex}`}
                        title={`${formatTime(point.timestamp)}\nFlow: ${point.flowValue.toFixed(0)}\nHeart: ${point.heartRateValue.toFixed(0)}\nFrustration: ${frustration.toFixed(0)}%\nExcitement: ${excitement.toFixed(0)}%\nCalm: ${calm.toFixed(0)}%`}
                        style={{ 
                          width: `${avatarSize}px`, 
                          height: `${avatarSize}px`,
                          outline: isSelected ? '2px solid #9333EA' : 'none',
                          zIndex: isSelected ? 1 : 'auto'
                        }}
                        className={`cursor-pointer hover:scale-110 transition-all ${isSelected ? 'ring-2 ring-accent' : ''}`}
                        onClick={visualizationMode === "range" ? () => handleCellSelect(hourKey, slotIndex) : undefined}
                      >
                        {visualizationMode === "avatar" ? (
                          <EmotionAvatar
                            emotion={emotion}
                            flowIntensity={point.flowValue}
                            heartRate={point.heartRateValue}
                            width={avatarSize}
                            height={avatarSize}
                            showLabel={false}
                          />
                        ) : (
                          <EmotionRange
                            frustratedIndicatorValue={frustration}
                            excitedIndicatorValue={excitement}
                            calmIndicatorValue={calm}
                            flowIntensity={point.flowValue}
                            heartRate={point.heartRateValue}
                            width={avatarSize}
                            height={avatarSize}
                            showLabel={false}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="flex justify-between mt-3 pt-2 border-t border-border/30">
          <p className="text-xs text-muted-foreground italic">
            Emotional state progression throughout the day based on flow and heart rate data
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Legend:</span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-gray-200"></div>
              <span className="text-xs text-muted-foreground">No data</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmotionTimeline; 