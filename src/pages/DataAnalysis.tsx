import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import DynamicSidebar from "@/components/DynamicSidebar";
import { motion, AnimatePresence } from "framer-motion";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from 'recharts';
import EmotionAvatar, { EmotionState } from "@/components/ui/EmotionAvatar";
import EmotionRange from "@/components/ui/EmotionRange";
import EmotionTimeline from "@/components/ui/EmotionTimeline";
import DayGradient from "@/components/ui/DayGradient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

type ReadingLevel = "eli5" | "eli15" | "high-school" | "college" | "phd";
type Dataset = "productivity" | "flowIntensity" | "heartRate" | "stress" | "learning" | "flowAndHeart" | "dreamInsights";

interface DataPoint {
  timestamp: string;
  value: number;
}

interface FlowRecord {
  userId: string;
  _ts: number;  // epoch timestamp in seconds
  flowActivityValues: number[];
  heartRateValues: number[];  // Add heart rate values
  frustratedIndicatorValue?: number[];
  excitedIndicatorValue?: number[];
  calmIndicatorValue?: number[];
}

// Corrected type: Only timestamp and average value for weekly chart
interface ProcessedFlowData {
  timestamp: string;
  value: number;
}

interface RawDataPoint {
  timestamp: string;
  value: number;
}

interface IntervalData {
  timestamp: string;
  min: number;
  max: number;
  average: number;
}

interface DailyInsights {
  flowIntensity: {
    average: number;
    peak: number;
    low: number;
    stability: number; // 0-100, higher means more stable
    peakTime: string;
    lowTime: string;
    deviation: number;
    outliers: { value: number; time: string }[];
  };
  heartRate: {
    average: number;
    peak: number;
    low: number;
    stability: number;
    peakTime: string;
    lowTime: string;
    deviation: number;
    outliers: { value: number; time: string }[];
  };
  correlation: number; // -1 to 1, correlation between flow and heart rate
  keyInsights: string[];
  frustratedIndicatorValue?: number; 
  excitedIndicatorValue?: number; 
  calmIndicatorValue?: number; 
  calmIntervals: IntervalData[];
  frustratedIntervals: IntervalData[];
  excitedIntervals: IntervalData[];
}

// Add type for raw indicator data points (same structure as RawDataPoint)
type RawIndicatorPoint = RawDataPoint;

// Add dream data interface
interface DreamPhase {
  timestamp: string;
  remIntensity: number;
  deepSleepLevel: number;
  deltaWaveActivity: number;
  dreamRecalled: boolean;
  emotionSignature?: string;
}

interface DreamInsight {
  date: string;
  totalSleepTime: number;
  remPercentage: number;
  deepSleepPercentage: number;
  dreamPhases: DreamPhase[];
  dominantEmotions: string[];
  correlations: {
    nextDayFlow: number;
    nextDayHeartRate: number;
    nextDayCreativity: number;
  };
}

const SAMPLE_DATA: Record<Dataset, { data: DataPoint[], description: Record<ReadingLevel, string> }> = {
  productivity: {
    data: Array.from({ length: 7 }, (_, i) => ({
      timestamp: `Day ${i + 1}`,
      value: Math.floor(Math.random() * 40) + 60,
    })),
    description: {
      eli5: "Your brain was super busy and got lots of work done! The spiky line shows when you were most focused.",
      eli15: "Your productivity levels show consistent high performance, with peak efficiency during mid-week sessions.",
      "high-school": "The data indicates strong productivity patterns with notable peaks in cognitive performance during key work periods.",
      college: "Analysis reveals sustained high productivity levels with significant correlations between focus periods and task completion rates.",
      phd: "Statistical analysis demonstrates consistent productivity optimization with notable periodic variations in cognitive resource allocation.",
    }
  },
  flowIntensity: {
    data: Array.from({ length: 7 }, (_, i) => ({
      timestamp: `Day ${i + 1}`,
      value: Math.floor(Math.random() * 30) + 70,
    })),
    description: {
      eli5: "Your brain's flow was like a river, moving smoothly and powerfully!",
      eli15: "Your flow intensity shows strong patterns of deep engagement and concentration.",
      "high-school": "The flow intensity metrics indicate sustained states of optimal performance.",
      college: "Analysis shows enhanced flow states with optimal cognitive engagement during tasks.",
      phd: "Quantitative assessment reveals sustained flow state patterns with optimal psychological immersion.",
    }
  },
  heartRate: {
    data: Array.from({ length: 7 }, (_, i) => ({
      timestamp: `Day ${i + 1}`,
      value: Math.floor(Math.random() * 30) + 60, // Random heart rate between 60-90
    })),
    description: {
      eli5: "Your heart beat like a steady drum, helping your brain work at its best!",
      eli15: "Your heart rate patterns show good cardiovascular engagement during tasks.",
      "high-school": "Heart rate metrics indicate optimal physiological arousal for cognitive tasks.",
      college: "Analysis reveals consistent cardiovascular patterns correlating with cognitive performance.",
      phd: "Cardiac metrics demonstrate optimal autonomic regulation during cognitive engagement periods.",
    }
  },
  stress: {
    data: Array.from({ length: 7 }, (_, i) => ({
      timestamp: `Day ${i + 1}`,
      value: Math.floor(Math.random() * 40) + 30,
    })),
    description: {
      eli5: "Your stress was like waves in the ocean - sometimes big, sometimes small, but mostly calm!",
      eli15: "Your stress levels stayed mostly manageable, with some expected variations during challenging tasks.",
      "high-school": "Stress measurements indicate moderate variability with effective regulation during peak periods.",
      college: "Analysis reveals effective stress management patterns with notable resilience during high-demand intervals.",
      phd: "Longitudinal stress analysis indicates adaptive autonomic regulation with optimal allostatic load management.",
    }
  },
  learning: {
    data: Array.from({ length: 7 }, (_, i) => ({
      timestamp: `Day ${i + 1}`,
      value: Math.floor(Math.random() * 25) + 75,
    })),
    description: {
      eli5: "Your brain was like a sponge, soaking up new things and getting smarter every day!",
      eli15: "Your learning capacity showed great results, picking up new information quickly and effectively.",
      "high-school": "Learning metrics demonstrate strong knowledge acquisition and retention patterns.",
      college: "Analysis indicates enhanced cognitive plasticity with efficient information processing and integration.",
      phd: "Cognitive acquisition metrics reveal optimized neural plasticity with enhanced synaptic consolidation patterns.",
    }
  },
  flowAndHeart: {
    data: Array.from({ length: 7 }, (_, i) => ({
      timestamp: `Day ${i + 1}`,
      value: Math.floor(Math.random() * 30) + 70,
    })),
    description: {
      eli5: "Your brain and heart worked together like a well-oiled machine!",
      eli15: "Your flow and heart rate patterns show strong coordination between mental and physical states.",
      "high-school": "Analysis reveals synchronized patterns between cognitive flow and cardiovascular activity.",
      college: "Data indicates optimal coordination between mental engagement and physiological responses.",
      phd: "Quantitative assessment demonstrates strong neuro-cardiac coupling with optimal performance states.",
    }
  },
  dreamInsights: {
    data: Array.from({ length: 7 }, (_, i) => ({
      timestamp: `Day ${i + 1}`,
      value: Math.floor(Math.random() * 35) + 65,
    })),
    description: {
      eli5: "Your brain was dreaming of colorful adventures while you slept! These dreams help your brain sort out all the things you learned during the day.",
      eli15: "Your sleep data shows several REM cycles where your brain was actively dreaming, which helps with memory consolidation and emotional processing.",
      "high-school": "Analysis of your sleep cycles reveals optimal REM patterns and dream states that correlate with your next-day cognitive performance.",
      college: "Your nocturnal brain activity demonstrates efficient memory consolidation during REM sleep with notable theta wave patterns during dream states.",
      phd: "Quantitative polysomnographic analysis indicates optimal hypnagogic-state memory consolidation with enhanced theta-gamma coupling during REM epochs.",
    }
  },
};

const processFlowData = (records: FlowRecord[], dataType: 'flow' | 'heart'): ProcessedFlowData[] => {
  const dailyAverages = records.reduce((acc, record) => {
    const date = new Date(record._ts * 1000).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = { sum: 0, count: 0 };
    }
    const value = dataType === 'flow' 
      ? (record.flowActivityValues[0] || 0)
      : (record.heartRateValues[0] || 0);
    if (value > 0) {
      acc[date].sum += value;
      acc[date].count += 1;
    }
    return acc;
  }, {} as Record<string, { sum: number; count: number }>);

  return Object.entries(dailyAverages).map(([date, { sum, count }]) => ({
    timestamp: date,
    value: count > 0 ? Math.round(sum / count) : 0,
  }));
};

const processRawData = (records: FlowRecord[], dataType: 'flow' | 'heart'): RawDataPoint[] => {
  return records.flatMap(record => {
    const values = dataType === 'flow' ? record.flowActivityValues : record.heartRateValues;
    return values.map((value, index) => ({
      timestamp: new Date(record._ts * 1000).toISOString(),
      value: value
    }));
  });
};

const processIndicatorData = (records: FlowRecord[], indicatorType: 'frustrated' | 'excited' | 'calm'): RawIndicatorPoint[] => {
  return records.flatMap(record => {
    let values: number[] | undefined;
    switch (indicatorType) {
      case 'frustrated': values = record.frustratedIndicatorValue; break;
      case 'excited': values = record.excitedIndicatorValue; break;
      case 'calm': values = record.calmIndicatorValue; break;
    }
    // Only map if values exist and are not empty
    return values && values.length > 0 ? values.map((value, index) => ({
      timestamp: new Date(record._ts * 1000).toISOString(), // Associate with the main timestamp
      value: value*100
    })) : [];
  });
};

const processIntervalData = (data: RawDataPoint[] | RawIndicatorPoint[], intervalMinutes: number = 5): IntervalData[] => {
  const intervals: { [key: string]: number[] } = {};
  
  data.forEach(point => {
    const date = new Date(point.timestamp);
    date.setMinutes(Math.floor(date.getMinutes() / intervalMinutes) * intervalMinutes);
    date.setSeconds(0);
    date.setMilliseconds(0);
    
    const key = date.toISOString();
    if (!intervals[key]) {
      intervals[key] = [];
    }
    if (point.value > 0) {
      intervals[key].push(point.value);
    }
  });

  return Object.entries(intervals).map(([timestamp, values]) => {
    if (values.length === 0) {
      return {
        timestamp,
        min: 0,
        max: 0,
        average: 0
      };
    }
    return {
      timestamp,
      min: Math.min(...values),
      max: Math.max(...values),
      average: values.reduce((a, b) => a + b, 0) / values.length
    };
  }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

const getLineColor = (dataset: Dataset): string => {
  switch (dataset) {
    case 'flowIntensity':
      return 'rgb(147, 51, 234)';  // Tailwind purple-600
    case 'heartRate':
      return 'rgb(239, 68, 68)';   // Tailwind red-500
    default:
      return 'rgb(var(--accent))';
  }
};

/**
 * Analyzes data points to find days with the most similar values
 * @param data Array of data points with timestamps and values
 * @param topCount Number of similar pairs to return
 * @returns Array of most similar day pairs sorted by smallest difference
 */
const findMostSimilarDays = (data: DataPoint[] | ProcessedFlowData[], topCount: number = 3): Array<{
  day1: string;
  day2: string;
  value1: number;
  value2: number;
  difference: number;
}> => {
  // Create all possible pairs of days
  const pairs: Array<{
    day1: string;
    day2: string;
    value1: number;
    value2: number;
    difference: number;
  }> = [];

  // Compare each day with every other day (only unique pairs)
  for (let i = 0; i < data.length; i++) {
    for (let j = i + 1; j < data.length; j++) {
      const day1 = data[i].timestamp;
      const day2 = data[j].timestamp;
      const value1 = data[i].value;
      const value2 = data[j].value;
      const difference = Math.abs(value1 - value2);

      pairs.push({
        day1,
        day2,
        value1,
        value2,
        difference
      });
    }
  }

  // Sort pairs by smallest difference
  const sortedPairs = [...pairs].sort((a, b) => a.difference - b.difference);

  // Return top N most similar pairs
  return sortedPairs.slice(0, topCount);
};

/**
 * Performs comparative analysis on flowIntensity and heartRate data
 * @param flowData Flow intensity data points
 * @param heartRateData Heart rate data points
 * @returns Analysis results for both datasets
 */
const performDualDatasetAnalysis = (
  flowData: ProcessedFlowData[],
  heartRateData: ProcessedFlowData[]
) => {
  const flowSimilarities = findMostSimilarDays(flowData);
  const heartRateSimilarities = findMostSimilarDays(heartRateData);
  
  return {
    flowIntensity: {
      datasetName: "Flow Intensity",
      color: "rgb(147, 51, 234)", // Purple
      similarities: flowSimilarities
    },
    heartRate: {
      datasetName: "Heart Rate",
      color: "rgb(239, 68, 68)", // Red
      similarities: heartRateSimilarities
    }
  };
};

const calculateCorrelation = (x: number[], y: number[]): number => {
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
  const sumX2 = x.reduce((a, b) => a + b * b, 0);
  const sumY2 = y.reduce((a, b) => a + b * b, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
};

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const analyzeDailyData = (
  rawFlowData: RawDataPoint[],
  rawHeartRateData: RawDataPoint[],
  rawFrustratedData: RawIndicatorPoint[],
  rawExcitedData: RawIndicatorPoint[],
  rawCalmData: RawIndicatorPoint[],
  day: string
): DailyInsights => {
  const dailyFlow = rawFlowData.filter(point => 
    new Date(point.timestamp).toDateString() === new Date(day).toDateString()
  );
  const dailyHeartRate = rawHeartRateData.filter(point => 
    new Date(point.timestamp).toDateString() === new Date(day).toDateString()
  );
  const dailyFrustrated = rawFrustratedData.filter(point => 
    new Date(point.timestamp).toDateString() === new Date(day).toDateString()
  );
  const dailyExcited = rawExcitedData.filter(point => 
    new Date(point.timestamp).toDateString() === new Date(day).toDateString()
  );
  const dailyCalm = rawCalmData.filter(point => 
    new Date(point.timestamp).toDateString() === new Date(day).toDateString()
  );

  // Process data in 5-minute intervals
  const flowIntervals = processIntervalData(dailyFlow, 5);
  const heartRateIntervals = processIntervalData(dailyHeartRate, 5);
  const calmIntervals = processIntervalData(dailyCalm, 5);
  const frustratedIntervals = processIntervalData(dailyFrustrated, 5);
  const excitedIntervals = processIntervalData(dailyExcited, 5);

  const calculateStats = (intervals: IntervalData[]) => {
    const validValues = intervals.map(d => d.average).filter(v => v > 0);
    const validTimestamps = intervals.filter(d => d.average > 0).map(d => d.timestamp);
    
    if (validValues.length === 0) {
      return {
        average: 0,
        peak: 0,
        low: 0,
        stability: 0,
        peakTime: '',
        lowTime: '',
        deviation: 0,
        outliers: []
      };
    }

    const avg = validValues.reduce((a, b) => a + b, 0) / validValues.length;
    const max = Math.max(...validValues);
    const min = Math.min(...validValues);
    const maxIndex = validValues.indexOf(max);
    const minIndex = validValues.indexOf(min);
    
    const variance = validValues.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / validValues.length;
    const deviation = Math.sqrt(variance);
    const stability = Math.max(0, 100 - (deviation * 3));

    // Find outliers (values more than 2 standard deviations from mean)
    const outliers = intervals
      .filter(d => d.average > 0)
      .filter(d => Math.abs(d.average - avg) > 2 * deviation)
      .map(d => ({
        value: d.average,
        time: formatTime(d.timestamp)
      }));

    return {
      average: Math.round(avg),
      peak: max,
      low: min,
      stability: Math.round(stability),
      peakTime: validTimestamps[maxIndex],
      lowTime: validTimestamps[minIndex],
      deviation: Math.round(deviation),
      outliers
    };
  };

  const flowStats = calculateStats(flowIntervals);
  const heartRateStats = calculateStats(heartRateIntervals);

  const correlation = calculateCorrelation(
    flowIntervals.map(d => d.average),
    heartRateIntervals.map(d => d.average)
  );

  const keyInsights: string[] = [];
  
  // Flow intensity insights with integer values and timing
  if (flowStats.peak > 80) {
    keyInsights.push(`Peak flow intensity of ${Math.round(flowStats.peak)}% at ${formatTime(flowStats.peakTime)}`);
  }
  if (flowStats.stability > 80) {
    keyInsights.push(`Very stable flow state with ${flowStats.stability}% consistency`);
  }
  if (flowStats.outliers.length > 0) {
    const outlierTimes = flowStats.outliers.map(o => `${Math.round(o.value)}% at ${o.time}`).join(', ');
    keyInsights.push(`Notable flow intensity spikes: ${outlierTimes}`);
  }
  
  // Heart rate insights with timing
  if (heartRateStats.peak > 90) {
    keyInsights.push(`Notable heart rate peak of ${Math.round(heartRateStats.peak)} bpm at ${formatTime(heartRateStats.peakTime)}`);
  }
  if (heartRateStats.stability > 80) {
    keyInsights.push(`Consistent heart rate patterns with ${heartRateStats.stability}% stability`);
  }
  if (heartRateStats.outliers.length > 0) {
    const outlierTimes = heartRateStats.outliers.map(o => `${Math.round(o.value)} bpm at ${o.time}`).join(', ');
    keyInsights.push(`Notable heart rate variations: ${outlierTimes}`);
  }

  // Add deviation information
  keyInsights.push(`Flow intensity deviation: ${flowStats.deviation} points`);
  keyInsights.push(`Heart rate deviation: ${heartRateStats.deviation} bpm`);
  
  // Correlation insights with more detail
  if (Math.abs(correlation) > 0.7) {
    keyInsights.push(
      correlation > 0 
        ? `Strong positive correlation (${correlation.toFixed(2)}) between flow and heart rate`
        : `Strong negative correlation (${correlation.toFixed(2)}) between flow and heart rate`
    );
  } else if (Math.abs(correlation) > 0.3) {
    keyInsights.push(
      correlation > 0 
        ? `Moderate positive correlation (${correlation.toFixed(2)}) between flow and heart rate`
        : `Moderate negative correlation (${correlation.toFixed(2)}) between flow and heart rate`
    );
  } else {
    keyInsights.push(`Weak correlation (${correlation.toFixed(2)}) between flow and heart rate`);
  }

  // Break time suggestions
  const flowPeakTime = new Date(flowStats.peakTime);
  const heartRatePeakTime = new Date(heartRateStats.peakTime);
  const timeDiff = Math.abs(flowPeakTime.getTime() - heartRatePeakTime.getTime()) / (1000 * 60);
  
  if (timeDiff < 30) {
    const breakTime = new Date(flowPeakTime.getTime() + 45 * 60000);
    keyInsights.push(`Consider taking a 15-minute break around ${formatTime(breakTime.toISOString())} after your peak performance period`);
  } else {
    keyInsights.push(`Consider taking breaks after peak periods: around ${formatTime(flowPeakTime.toISOString())} and ${formatTime(heartRatePeakTime.toISOString())}`);
  }

  // Water intake suggestions
  const avgFlow = flowStats.average;
  const avgHeartRate = heartRateStats.average;
  let baseIntake = 2; // Base 2L per day
  
  if (avgFlow > 80) {
    baseIntake += 0.5;
  } else if (avgFlow > 60) {
    baseIntake += 0.3;
  }
  
  if (avgHeartRate > 80) {
    baseIntake += 0.5;
  } else if (avgHeartRate > 70) {
    baseIntake += 0.3;
  }
  
  keyInsights.push(`Recommended water intake: ${baseIntake.toFixed(1)}L based on your activity levels`);

  // --- Calculate final indicators: Use raw data if available, else use heuristics ---
  
  // Function to calculate average from raw daily indicator points
  const getAverageIndicator = (dailyIndicatorData: RawIndicatorPoint[]): number | null => {
    const validValues = dailyIndicatorData.map(p => p.value).filter(v => typeof v === 'number');
    if (validValues.length === 0) return null;
    return validValues.reduce((a, b) => a + b, 0) / validValues.length;
  };

  const avgFrustratedRaw = getAverageIndicator(dailyFrustrated);
  const avgExcitedRaw = getAverageIndicator(dailyExcited);
  const avgCalmRaw = getAverageIndicator(dailyCalm);

  let finalFrustratedIndicator: number;
  let finalExcitedIndicator: number;
  let finalCalmIndicator: number;

  // Use raw average if available, otherwise calculate heuristic
  if (avgFrustratedRaw !== null) {
    finalFrustratedIndicator = avgFrustratedRaw;
  } else {
    let frustratedHeuristic = 0;
    if (flowStats.stability < 40 && heartRateStats.stability > 60) frustratedHeuristic += 30;
    if (flowStats.average < 40 && heartRateStats.average > 85) frustratedHeuristic += 30;
    if (correlation < -0.5) frustratedHeuristic += 40;
    finalFrustratedIndicator = Math.min(100, frustratedHeuristic * 1.5); 
  }

  if (avgExcitedRaw !== null) {
    finalExcitedIndicator = avgExcitedRaw;
  } else {
    let excitedHeuristic = 0;
    if (flowStats.average > 75) excitedHeuristic += 40;
    if (flowStats.peak > 85) excitedHeuristic += 20;
    if (heartRateStats.average > 80) excitedHeuristic += 20;
    if (heartRateStats.peak > 95) excitedHeuristic += 20;
    finalExcitedIndicator = Math.min(100, excitedHeuristic); 
  }

  if (avgCalmRaw !== null) {
    finalCalmIndicator = avgCalmRaw;
  } else {
    let calmHeuristic = 0;
    if (flowStats.average < 50 && heartRateStats.average < 70) calmHeuristic += 40;
    if (flowStats.stability > 70) calmHeuristic += 30;
    if (heartRateStats.stability > 70) calmHeuristic += 30;
    finalCalmIndicator = Math.min(100, calmHeuristic);
  }
  
  return {
    flowIntensity: flowStats,
    heartRate: heartRateStats,
    correlation,
    keyInsights,
    frustratedIndicatorValue: Math.round(finalFrustratedIndicator),
    excitedIndicatorValue: Math.round(finalExcitedIndicator),
    calmIndicatorValue: Math.round(finalCalmIndicator),
    calmIntervals: calmIntervals,
    frustratedIntervals: frustratedIntervals,
    excitedIntervals: excitedIntervals,
  };
};

// Add dream insights generator function
const generateDreamInsights = (date: Date): DreamInsight => {
  // Create data for a specific date
  const totalSleepTime = 6 + Math.random() * 3; // 6-9 hours
  const remPercentage = 20 + Math.random() * 15; // 20-35%
  const deepSleepPercentage = 15 + Math.random() * 20; // 15-35%
  
  // Generate dream phases (typically 4-5 REM cycles per night)
  const dreamPhases: DreamPhase[] = [];
  const numPhases = 4 + Math.floor(Math.random() * 2); // 4-5 phases
  
  const emotions = ["calm", "joy", "curiosity", "anticipation", "wonder", "concern", "nostalgia", "excitement"];
  const dominantEmotions = [];
  
  // Get 2-3 random dominant emotions
  for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
    const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
    if (!dominantEmotions.includes(randomEmotion)) {
      dominantEmotions.push(randomEmotion);
    }
  }
  
  // Generate each sleep phase
  for (let i = 0; i < numPhases; i++) {
    const phaseStart = new Date(date);
    // First REM typically occurs 90 minutes after falling asleep, then every ~90 minutes
    phaseStart.setHours(23 + Math.floor(i / 2), 30 + (90 * i) % 60, 0, 0);
    
    const remIntensity = 70 + Math.random() * 30; // 70-100
    const deepSleepLevel = 30 + Math.random() * 40; // 30-70
    const deltaWaveActivity = 50 + Math.random() * 50; // 50-100
    
    // More likely to recall dreams from later REM phases
    const dreamRecalled = Math.random() < 0.3 + (i * 0.15);
    
    dreamPhases.push({
      timestamp: phaseStart.toISOString(),
      remIntensity,
      deepSleepLevel,
      deltaWaveActivity,
      dreamRecalled,
      emotionSignature: dreamRecalled ? dominantEmotions[i % dominantEmotions.length] : undefined
    });
  }
  
  return {
    date: date.toISOString().split('T')[0],
    totalSleepTime,
    remPercentage,
    deepSleepPercentage,
    dreamPhases,
    dominantEmotions,
    correlations: {
      nextDayFlow: 0.3 + Math.random() * 0.6, // 0.3-0.9
      nextDayHeartRate: 0.2 + Math.random() * 0.5, // 0.2-0.7
      nextDayCreativity: 0.4 + Math.random() * 0.5 // 0.4-0.9
    }
  };
};

// New component for Dream Insights visualization
const DreamInsightsVisualization = ({ dreamData }: { dreamData: DreamInsight | null }) => {
  if (!dreamData) {
    return (
      <div className="w-full h-[200px] flex items-center justify-center border rounded-md bg-accent/5">
        <p className="text-center text-sm text-muted-foreground">
          No dream data available for this day
        </p>
      </div>
    );
  }

  // Format the dream phases data for the chart
  const chartData = dreamData.dreamPhases.map(phase => ({
    timestamp: new Date(phase.timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    }),
    remIntensity: phase.remIntensity,
    deltaWaveActivity: phase.deltaWaveActivity,
    deepSleepLevel: phase.deepSleepLevel,
    recalled: phase.dreamRecalled ? "Yes" : "No"
  }));

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base">Dream Insights</CardTitle>
          <div className="flex gap-1">
            {dreamData.dominantEmotions.map(emotion => (
              <Badge key={emotion} variant="outline" className="text-xs">
                {emotion}
              </Badge>
            ))}
          </div>
        </div>
        <CardDescription>
          Sleep quality: {Math.round((dreamData.remPercentage + dreamData.deepSleepPercentage) / 2)}% • 
          Total sleep: {dreamData.totalSleepTime.toFixed(1)} hours
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="cycles">
          <TabsList className="mb-2">
            <TabsTrigger value="cycles">Sleep Cycles</TabsTrigger>
            <TabsTrigger value="correlation">Next-Day Impact</TabsTrigger>
          </TabsList>
          
          <TabsContent value="cycles" className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis domain={[0, 100]} />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === "remIntensity") return [`${value}% REM Intensity`, "REM"];
                    if (name === "deltaWaveActivity") return [`${value}% Delta Wave`, "Delta"];
                    if (name === "deepSleepLevel") return [`${value}% Deep Sleep`, "Deep Sleep"];
                    return [value, name];
                  }}
                  contentStyle={{ color: 'black' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="remIntensity" 
                  name="REM"
                  stroke="#9333EA" // Purple
                  strokeWidth={2}
                  dot={true}
                />
                <Line 
                  type="monotone" 
                  dataKey="deltaWaveActivity" 
                  name="Delta"
                  stroke="#3B82F6" // Blue
                  strokeWidth={2}
                  dot={true}
                />
                <Line 
                  type="monotone" 
                  dataKey="deepSleepLevel" 
                  name="Deep"
                  stroke="#14B8A6" // Teal
                  strokeWidth={2}
                  dot={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
          
          <TabsContent value="correlation" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center">
                <div className="text-4xl font-semibold text-purple-600">
                  {(dreamData.correlations.nextDayFlow * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground text-center">
                  Flow correlation
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-4xl font-semibold text-red-500">
                  {(dreamData.correlations.nextDayHeartRate * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground text-center">
                  Heart rate stability
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-4xl font-semibold text-blue-500">
                  {(dreamData.correlations.nextDayCreativity * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground text-center">
                  Creativity boost
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Your dream patterns show a {dreamData.correlations.nextDayFlow > 0.7 ? "strong" : 
              dreamData.correlations.nextDayFlow > 0.5 ? "moderate" : "mild"} correlation with 
              next-day flow states and cognitive performance.
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

const DataAnalysis = () => {
  const [selectedDataset, setSelectedDataset] = useState<Dataset>("flowIntensity");
  const [readingLevel, setReadingLevel] = useState<ReadingLevel>("college");
  const [selectedDay, setSelectedDay] = useState<string>(new Date().toLocaleDateString());
  const [viewMode, setViewMode] = useState<'weekly' | 'daily'>('daily');
  const [emotionDisplayMode, setEmotionDisplayMode] = useState<'avatar' | 'range'>('range');
  const [actions, setActions] = useState<Array<{ id: string; type: string; description: string; timestamp: Date }>>([]);
  const { toast } = useToast();
  const [flowData, setFlowData] = useState<ProcessedFlowData[]>([]);
  const [heartRateData, setHeartRateData] = useState<ProcessedFlowData[]>([]);
  const [rawFlowData, setRawFlowData] = useState<RawDataPoint[]>([]);
  const [rawHeartRateData, setRawHeartRateData] = useState<RawDataPoint[]>([]);
  const [rawFrustratedData, setRawFrustratedData] = useState<RawIndicatorPoint[]>([]);
  const [rawExcitedData, setRawExcitedData] = useState<RawIndicatorPoint[]>([]);
  const [rawCalmData, setRawCalmData] = useState<RawIndicatorPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [showAnalysisResults, setShowAnalysisResults] = useState(false);
  const [dailyInsights, setDailyInsights] = useState<DailyInsights | null>(null);
  const [currentFlowValue, setCurrentFlowValue] = useState(50);
  const [currentHeartRate, setCurrentHeartRate] = useState(75);
  const [timelineData, setTimelineData] = useState<Array<{ timestamp: string; flowValue: number; heartRateValue: number, frustratedValue: number, excitedValue: number, calmValue: number}>>([]);
  const [dreamInsights, setDreamInsights] = useState<DreamInsight | null>(null);

  const addAction = (type: string, description: string) => {
    const newAction = {
      id: crypto.randomUUID(),
      type,
      description,
      timestamp: new Date(),
    };
    setActions(prev => [newAction, ...prev].slice(0, 5));
  };

  // Function to update the timeline data
  const updateTimelineData = (day: string) => {
    if (!day || rawFlowData.length === 0 || rawHeartRateData.length === 0) {
      console.error("Cannot update timeline data - missing required data:", {
        day,
        rawFlowDataLength: rawFlowData.length,
        rawHeartRateDataLength: rawHeartRateData.length
      });
      return;
    }
    
    setIsTimelineLoading(true);
    
    setTimeout(() => {
      try {
        const selectedDate = new Date(day);
        const dayStart = new Date(selectedDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(selectedDate);
        dayEnd.setHours(23, 59, 59, 999);
        
        const dayFlowData = rawFlowData.filter(point => {
          const pointDate = new Date(point.timestamp);
          return pointDate.toDateString() === selectedDate.toDateString();
        });
        
        const dayHeartData = rawHeartRateData.filter(point => {
          const pointDate = new Date(point.timestamp);
          return pointDate.toDateString() === selectedDate.toDateString();
        });
        
        const hasEnoughData = dayFlowData.length >= 3 && dayHeartData.length >= 3;
        
        if (!hasEnoughData) {
          const fallbackData = generateFallbackTimelineData(selectedDate);
          setTimelineData(fallbackData);
          setIsTimelineLoading(false);
          return;
        }

        const timePoints: Array<{
          timestamp: string;
          flowValue: number;
          heartRateValue: number;
          frustratedValue: number; // Add frustrated value
          excitedValue: number; // Add excited value
          calmValue: number; // Add calm value
        }> = [];
        
        for (
          let currentTime = new Date(dayStart); 
          currentTime <= dayEnd;
          currentTime.setMinutes(currentTime.getMinutes() + 5)
        ) {
          const relevantFlowData = dayFlowData.filter(point => {
            const pointTime = new Date(point.timestamp).getTime();
            return Math.abs(pointTime - currentTime.getTime()) <= 15000; // 15 seconds window
          });
          
          const relevantHeartData = dayHeartData.filter(point => {
            const pointTime = new Date(point.timestamp).getTime();
            return Math.abs(pointTime - currentTime.getTime()) <= 15000; // 15 seconds window
          });

          const relevantFrustratedData = rawFrustratedData.filter(point => {
            const pointTime = new Date(point.timestamp).getTime();
            return Math.abs(pointTime - currentTime.getTime()) <= 15000; // 15 seconds window
          });
          
          const relevantExcitedData = rawExcitedData.filter(point => {
            const pointTime = new Date(point.timestamp).getTime();
            return Math.abs(pointTime - currentTime.getTime()) <= 15000; // 15 seconds window
          });

          const relevantCalmData = rawCalmData.filter(point => {
            const pointTime = new Date(point.timestamp).getTime();
            return Math.abs(pointTime - currentTime.getTime()) <= 15000; // 15 seconds window
          });
          
          const avgFlow = relevantFlowData.length > 0
            ? relevantFlowData.reduce((sum, point) => sum + point.value, 0) / relevantFlowData.length
            : 50; // Default value
          
          const avgHeart = relevantHeartData.length > 0
            ? relevantHeartData.reduce((sum, point) => sum + point.value, 0) / relevantHeartData.length
            : 75; // Default value
          
          // Calculate emotional indicators
          const avgFrustrated = relevantFrustratedData.length > 0
            ? relevantFrustratedData.reduce((sum, point) => sum + point.value, 0) / relevantFrustratedData.length
            : 0;
          
          const avgExcited = relevantExcitedData.length > 0
            ? relevantExcitedData.reduce((sum, point) => sum + point.value, 0) / relevantExcitedData.length
            : 0;
          
          const avgCalm = relevantCalmData.length > 0
            ? relevantCalmData.reduce((sum, point) => sum + point.value, 0) / relevantCalmData.length
            : 0;
          
          const timePoint = {
            timestamp: currentTime.toISOString(),
            flowValue: avgFlow,
            heartRateValue: avgHeart,
            frustratedValue: avgFrustrated,
            excitedValue: avgExcited,
            calmValue: avgCalm
          };
          
          timePoints.push(timePoint);
        }
        
        setTimelineData(timePoints);
        // console.log(timePoints);
      } catch (error) {
        console.error("Error generating timeline data:", error);
        const fallbackData = generateFallbackTimelineData(new Date(day));
        setTimelineData(fallbackData);
      } finally {
        setIsTimelineLoading(false);
      }
    }, 300);
  };
  
  // Generate fallback timeline data if real data is insufficient
  const generateFallbackTimelineData = (date: Date) => {
    const timePoints: Array<{ timestamp: string; flowValue: number; heartRateValue: number, frustratedValue: number, excitedValue: number, calmValue: number }> = [];
    
    // Set to beginning of day
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    
    // Set to end of day
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    
    // Generate more focused data for typical activity hours
    // We'll generate data for the entire 24-hour period, but with more realistic patterns
    // based on typical human activity cycles
    
    // Generate data points for each hour and 5-minute interval
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 5) {
        const currentTime = new Date(date);
        currentTime.setHours(hour, minute, 0, 0);
        
        // Generate different patterns based on time of day
        let sampleFlow = 50;
        let activityMultiplier = 1.0;
        
        // Late night / early morning (0-6): Low activity
        if (hour >= 0 && hour < 6) {
          activityMultiplier = 0.5;
          sampleFlow = 20 + (Math.random() * 15);
        }
        // Morning ramp-up (6-9): Gradually increasing
        else if (hour >= 6 && hour < 9) {
          activityMultiplier = 0.7 + ((hour - 6) / 3) * 0.3;
          sampleFlow = 30 + ((hour - 6) / 3) * 30 + (Math.random() * 20);
        }
        // Morning work period (9-12): High activity
        else if (hour >= 9 && hour < 12) {
          activityMultiplier = 1.0;
          sampleFlow = 60 + ((hour - 9) / 3) * 20 + (Math.random() * 15);
        }
        // Lunch dip (12-14): Decreased activity
        else if (hour >= 12 && hour < 14) {
          activityMultiplier = 0.8;
          sampleFlow = 50 + (Math.random() * 20);
        }
        // Afternoon work period (14-17): High activity
        else if (hour >= 14 && hour < 17) {
          activityMultiplier = 1.0;
          sampleFlow = 70 + ((17 - hour) / 3) * 15 + (Math.random() * 15);
        }
        // Evening wind-down (17-21): Gradually decreasing
        else if (hour >= 17 && hour < 21) {
          activityMultiplier = 0.9 - ((hour - 17) / 4) * 0.3;
          sampleFlow = 60 - ((hour - 17) / 4) * 30 + (Math.random() * 15);
        }
        // Night relaxation (21-24): Low activity
        else {
          activityMultiplier = 0.6;
          sampleFlow = 30 + (Math.random() * 20);
        }
        
        // Add some periodic variations based on 5-minute intervals
        // This creates a wave pattern within each hour
        const minuteFactor = (minute % 60) / 60;
        const minuteVariation = Math.sin(minuteFactor * Math.PI * 2) * 8 * activityMultiplier;
        sampleFlow += minuteVariation;
        
        // Heart rate follows flow but with some variation and is less volatile
        let sampleHeartRate = 60 + (sampleFlow / 100) * 25 * activityMultiplier;
        
        // Add some periodic variations
        const heartVariation = Math.cos(minuteFactor * Math.PI * 2) * 6 * activityMultiplier;
        sampleHeartRate += heartVariation;
        
        // Add some randomness (less for heart rate as it's more stable)
        sampleFlow += (Math.random() * 10 - 5) * activityMultiplier;
        sampleHeartRate += (Math.random() * 6 - 3) * activityMultiplier;
        
        // Add a sample data point - only if it would be visible
        // (no need to generate data for times when user is likely asleep/inactive)
        const isActiveTime = hour >= 7 && hour <= 22; // 7 AM to 10 PM
        const shouldAddDataPoint = isActiveTime || Math.random() < 0.2; // 20% chance to add point in inactive hours
        
        if (shouldAddDataPoint) {
          timePoints.push({
            timestamp: currentTime.toISOString(),
            flowValue: Math.round(Math.min(Math.max(sampleFlow, 0), 100)),
            heartRateValue: Math.round(Math.min(Math.max(sampleHeartRate, 50), 100)),
            frustratedValue: Math.round(getFrustration(sampleFlow, sampleHeartRate)),
            excitedValue: Math.round(getExcitement(sampleFlow,sampleHeartRate)),
            calmValue: Math.round(getCalm(sampleFlow,sampleHeartRate))
          });
        }
      }
    }
    
    return timePoints;
  };

  // Calculate frustration based on flow and heart rate
const getFrustration = (flow: number, heart: number): number => {
  // Higher heart rate and lower flow indicates frustration
  if (flow < 40 && heart > 80) return 85;
  if (flow < 60 && heart > 70) return 60;
  return Math.max(0, Math.min(100, 100 - flow + (heart - 70)));
};

// Calculate excitement based on flow and heart rate
const getExcitement = (flow: number, heart: number): number => {
  // High flow and elevated heart rate indicates excitement
  if (flow > 80 && heart > 75) return 85;
  if (flow > 60 && heart > 65) return 60;
  return Math.max(0, Math.min(100, flow * 0.8 + (heart - 60) * 0.4));
};

// Calculate calm based on flow and heart rate
const getCalm = (flow: number, heart: number): number => {
  // Moderate flow and lower heart rate indicates calm
  if (flow > 40 && flow < 80 && heart < 70) return 85;
  if (heart < 75) return 60;
  return Math.max(0, Math.min(100, 100 - (heart - 50)));
};

  const handleDatasetChange = (value: Dataset) => {
    setSelectedDataset(value);
    addAction("processing", `Analyzing ${value} dataset...`);
    
    // If dream insights selected, fetch dream data
    if (value === "dreamInsights") {
      const selectedDate = new Date(selectedDay);
      // Get dream data from previous night
      const previousDay = new Date(selectedDate);
      previousDay.setDate(previousDay.getDate() - 1);
      setDreamInsights(generateDreamInsights(previousDay));
    }
    
    setTimeout(() => {
      addAction("complete", "Analysis completed!");
      toast({
        title: "Analysis Complete",
        description: `Analysis of ${value} data completed successfully`,
      });
    }, 1500);
  };

  const handleDaySelect = (day: string) => {
    // console.log("Day selected:", day);
    setSelectedDay(day);
    
    // Reset the timeline loading state and data
    setIsTimelineLoading(true);
    
    // Allow UI to update before processing data
    setTimeout(() => {
      if (day && rawFlowData && rawHeartRateData) {
        // console.log("Processing data for selected day:", day);
        
        // Generate insights using data from state (including indicators)
        const insights = analyzeDailyData(
          rawFlowData, 
          rawHeartRateData, 
          rawFrustratedData, // Pass indicator data from state
          rawExcitedData,    // Pass indicator data from state
          rawCalmData,       // Pass indicator data from state
          day 
        ); 
        setDailyInsights(insights); 
        
        // Generate timeline data 
        updateTimelineData(day); 

        // If dream insights is the selected dataset, generate dream data
        if (selectedDataset === "dreamInsights") {
          const selectedDate = new Date(day);
          // Get dream data from previous night
          const previousDay = new Date(selectedDate);
          previousDay.setDate(previousDay.getDate() - 1);
          setDreamInsights(generateDreamInsights(previousDay));
        }
      } else { 
        console.warn("Cannot process data for day:", day, "- missing required raw flow/heart rate data"); 
        setIsTimelineLoading(false);
      }
    }, 0);
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setIsTimelineLoading(true);
      try {
        const response = await fetch(`http://localhost:3000/api/getFlowIntensityData`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            days: 7
          }),
        });

        if (!response.ok) throw new Error('Failed to fetch data');
        
        const records: FlowRecord[] = await response.json();
        
        // Always process both flow and heart rate data
        const processedFlowData = processFlowData(records, 'flow');
        const processedHeartRateData = processFlowData(records, 'heart');
        const rawFlowDataPoints = processRawData(records, 'flow');
        const rawHeartRateDataPoints = processRawData(records, 'heart');
        // Process optional indicator data
        const rawFrustratedPoints = processIndicatorData(records, 'frustrated');
        const rawExcitedPoints = processIndicatorData(records, 'excited');
        const rawCalmPoints = processIndicatorData(records, 'calm');
        
        setFlowData(processedFlowData);
        setHeartRateData(processedHeartRateData);
        setRawFlowData(rawFlowDataPoints);
        setRawHeartRateData(rawHeartRateDataPoints);
        setRawFrustratedData(rawFrustratedPoints);
        setRawExcitedData(rawExcitedPoints);
        setRawCalmData(rawCalmPoints);

        // After setting the raw data, call updateTimelineData directly to ensure state is updated
        if (selectedDay) {
          // console.log("Initializing data for selected day:", selectedDay);
          
          // Trigger daily insights calculation, passing the newly processed raw data
          const insights = analyzeDailyData(
            rawFlowDataPoints, 
            rawHeartRateDataPoints, 
            rawFrustratedPoints, 
            rawExcitedPoints, 
            rawCalmPoints, 
            selectedDay
          ); 
          setDailyInsights(insights); 
          
          // Generate timeline data 
          updateTimelineData(selectedDay); 
        }
        
      } catch (error) {
        // console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to fetch data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
        // Timeline loading will be set to false inside updateTimelineData function
      }
    };

    // Always fetch data when component mounts or when dataset changes
    fetchData();
  }, [selectedDataset, selectedDay]); // Keep selectedDay as a dependency

  const runSimilarityAnalysis = () => {
    if (flowData.length < 2 || heartRateData.length < 2) {
      toast({
        title: "Insufficient Data",
        description: "Need at least two days of data for comparison",
        variant: "destructive",
      });
      return;
    }

    addAction("processing", "Running similarity analysis...");
    setIsLoading(true);
    
    // Simulate processing time
    setTimeout(() => {
      const results = performDualDatasetAnalysis(flowData, heartRateData);
      setAnalysisResults(results);
      setShowAnalysisResults(true);
      setIsLoading(false);
      addAction("complete", "Similarity analysis completed!");
      
      toast({
        title: "Analysis Complete",
        description: "Days with similar patterns identified",
      });
    }, 1000);
  };

  const getDailyData = (day: string, dataType: 'flow' | 'heart') => {
    const rawData = dataType === 'flow' ? rawFlowData : rawHeartRateData;
    const dailyData = rawData.filter(point => {
      const pointDate = new Date(point.timestamp);
      const selectedDate = new Date(day);
      return pointDate.toDateString() === selectedDate.toDateString();
    });
    return processIntervalData(dailyData);
  };

  const calculateDataRange = (data: IntervalData[], dataType: 'flow' | 'heart' = 'heart') => {
    const validValues = data
      .map(d => d.average)
      .filter(v => v > 0);
    
    if (validValues.length === 0) {
      return { min: 0, max: dataType === 'flow' ? 150 : 100 };
    }

    const min = Math.min(...validValues);
    const max = Math.max(...validValues);
    
    // Add more padding to the range (15% on each side)
    const padding = (max - min) * 0.15;
    return {
      min: Math.max(0, Math.floor(min - padding)),
      max: dataType === 'flow' 
        ? Math.ceil(max + padding * 3) // Add 200% more padding for flow intensity
        : Math.min(100, Math.ceil(max + padding * 2.5)) // Keep heart rate capped at 100
    };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const chartData = (() => {
    if (selectedDataset === 'flowAndHeart' && flowData.length > 0 && heartRateData.length > 0) {
      return flowData.map((flow, index) => ({
        timestamp: flow.timestamp,
        flowValue: flow.value,
        heartValue: heartRateData[index]?.value || 0
      }));
    }
    if ((selectedDataset === 'flowIntensity' || selectedDataset === 'heartRate') && flowData.length > 0) {
      return flowData;
    }
    return SAMPLE_DATA[selectedDataset].data;
  })();

  const availableDays = chartData.map(point => point.timestamp);

  // Mock real-time data update function
  const updateRealTimeData = useCallback(() => {
    // Get newest flow value based on the most recent data point
    if (rawFlowData.length > 0) {
      const latestTimestamp = new Date(Math.max(...rawFlowData.map(d => new Date(d.timestamp).getTime())));
      const latestFlowData = rawFlowData.filter(d => 
        new Date(d.timestamp).getTime() === latestTimestamp.getTime()
      );
      
      if (latestFlowData.length > 0) {
        setCurrentFlowValue(latestFlowData[0].value);
      }
      
      const latestHeartData = rawHeartRateData.filter(d => 
        new Date(d.timestamp).getTime() === latestTimestamp.getTime()
      );
      
      if (latestHeartData.length > 0) {
        setCurrentHeartRate(latestHeartData[0].value);
      }
    }
  }, [rawFlowData, rawHeartRateData]);
  
  // Update real-time values whenever new data is loaded
  useEffect(() => {
    updateRealTimeData();
  }, [rawFlowData, rawHeartRateData, updateRealTimeData]);
  
  // Ensure timeline data is loaded whenever raw data changes
  useEffect(() => {
    if (selectedDay && rawFlowData.length > 0 && rawHeartRateData.length > 0 && timelineData.length === 0) {
      // console.log("Initial timeline data load triggered");
      updateTimelineData(selectedDay);
    }
  }, [rawFlowData, rawHeartRateData, selectedDay, timelineData.length]);

  // --- Merge Calm/Frustrated Interval Data --- 
  const indicatorChartData = useMemo(() => {
    if (!dailyInsights?.calmIntervals || !dailyInsights?.frustratedIntervals || !dailyInsights?.excitedIntervals) {
      return [];
    }

    const combined: { [timestamp: string]: { calmValue?: number; frustratedValue?: number; excitedValue?: number } } = {};

    dailyInsights.calmIntervals.forEach(interval => {
      if (!combined[interval.timestamp]) combined[interval.timestamp] = {};
      combined[interval.timestamp].calmValue = interval.average;
    });

    dailyInsights.frustratedIntervals.forEach(interval => {
      if (!combined[interval.timestamp]) combined[interval.timestamp] = {};
      combined[interval.timestamp].frustratedValue = interval.average;
    });

    dailyInsights.excitedIntervals.forEach(interval => {
      if (!combined[interval.timestamp]) combined[interval.timestamp] = {};
      combined[interval.timestamp].excitedValue = interval.average;
    });

    return Object.entries(combined)
      .map(([timestamp, values]) => ({
        timestamp,
        calmValue: (values.calmValue ?? 0),
        frustratedValue: (values.frustratedValue ?? 0),
        excitedValue: (values.excitedValue ?? 0),
      }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [dailyInsights]);

  return (
    <div className="flex min-h-screen w-full">
      <DynamicSidebar />
      
      <main className="flex-1 neural-bg">
        <div className="flex h-screen flex-col p-6">
          <div className="mb-4">
            <h1 className="text-2xl font-bold">Data Analysis</h1>
            <p className="text-muted-foreground">Analyze daily activity patterns</p>
          </div>

          <ScrollArea className="flex-1 rounded-lg border border-sidebar-border bg-background/50 p-4">
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Select
                    value={selectedDataset}
                    onValueChange={(value: Dataset) => handleDatasetChange(value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select dataset to analyze" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flowAndHeart">Flow & Heart Rate</SelectItem>
                      <SelectItem value="flowIntensity">Flow Intensity</SelectItem>
                      <SelectItem value="heartRate">Heart Rate</SelectItem>
                      <SelectItem value="dreamInsights">Dream Insights</SelectItem>
                      <SelectItem value="productivity">Productivity Patterns</SelectItem>
                      <SelectItem value="stress">Stress Patterns</SelectItem>
                      <SelectItem value="learning">Learning Capacity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <ToggleGroup
                  type="single"
                  value={viewMode}
                  onValueChange={(value: 'weekly' | 'daily') => value && setViewMode(value)}
                  className="justify-end"
                >
                  <ToggleGroupItem value="weekly" aria-label="Weekly View">
                    Weekly
                  </ToggleGroupItem>
                  <ToggleGroupItem value="daily" aria-label="Daily View">
                    Daily
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              {viewMode === 'weekly' ? (
                <div className="h-[300px] w-full">
                  <h3 className="text-lg font-medium mb-2">Weekly Overview</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip 
                        formatter={(value, name, props) => {
                          const formattedValue = typeof value === 'number' ? value.toFixed(0) : value;
                          if (props.dataKey === 'flowValue') return [formattedValue, 'Flow Intensity'];
                          if (props.dataKey === 'heartValue') return [formattedValue, 'Heart Rate'];
                          // Fallback for other datasets
                          return [formattedValue, 'Value']; 
                        }}
                        contentStyle={{ color: 'black' }}
                      />
                      {selectedDataset === 'flowAndHeart' ? (
                        <>
                          <Line 
                            type="monotone" 
                            dataKey="flowValue" 
                            name="Flow Intensity"
                            stroke={getLineColor('flowIntensity')}
                            strokeWidth={2}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="heartValue" 
                            name="Heart Rate"
                            stroke={getLineColor('heartRate')}
                            strokeWidth={2}
                          />
                        </>
                      ) : (
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke={getLineColor(selectedDataset)}
                          strokeWidth={2}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                      <div className="animate-spin h-6 w-6 border-2 border-accent border-t-transparent rounded-full" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Daily Breakdown</h3>
                    <Select
                      value={selectedDay}
                      onValueChange={handleDaySelect}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a day to view detailed data" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableDays.map((day) => (
                          <SelectItem key={day} value={day}>
                            {formatDate(day)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedDay && selectedDataset === "dreamInsights" && (
                    <DreamInsightsVisualization dreamData={dreamInsights} />
                  )}
                  
                  {selectedDay && dailyInsights && (
                    <div className="space-y-4">
                      {/* Charts section */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="h-[200px] w-full">
                          <h4 className="text-sm font-medium mb-2">Flow Intensity</h4>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={getDailyData(selectedDay, 'flow')}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                dataKey="timestamp" 
                                tickFormatter={formatTime}
                                interval="preserveStartEnd"
                              />
                              <YAxis 
                                domain={[
                                  (dataMin) => calculateDataRange(getDailyData(selectedDay, 'flow'), 'flow').min,
                                  (dataMax) => calculateDataRange(getDailyData(selectedDay, 'flow'), 'flow').max
                                ]}
                              />
                              <Tooltip 
                                labelFormatter={(label) => formatTime(label)}
                                formatter={(value) => [
                                  typeof value === 'number' ? value.toFixed(0) + '%' : value,
                                  'Flow Intensity'
                                ]}
                                contentStyle={{ color: 'black' }}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="average" 
                                stroke={getLineColor('flowIntensity')}
                                strokeWidth={2}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="h-[200px] w-full">
                          <h4 className="text-sm font-medium mb-2">Heart Rate</h4>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={getDailyData(selectedDay, 'heart')}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                dataKey="timestamp" 
                                tickFormatter={formatTime}
                                interval="preserveStartEnd"
                              />
                              <YAxis 
                                domain={[
                                  (dataMin) => calculateDataRange(getDailyData(selectedDay, 'heart'), 'heart').min,
                                  (dataMax) => calculateDataRange(getDailyData(selectedDay, 'heart'), 'heart').max
                                ]}
                              />
                              <Tooltip 
                                labelFormatter={(label) => formatTime(label)}
                                formatter={(value) => [
                                  typeof value === 'number' ? value.toFixed(0) + ' bpm' : value,
                                  'Heart Rate'
                                ]}
                                contentStyle={{ color: 'black' }}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="average" 
                                stroke={getLineColor('heartRate')}
                                strokeWidth={2}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      
                      <br></br>
                      {/* New Calm vs Frustrated Chart */}
                      <div className="h-[200px] w-full mt-4">
                        <h4 className="text-sm font-medium mb-2">Calm vs. Frustration vs. Excitement Indicators (5min Avg)</h4>
                        {indicatorChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={indicatorChartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                                dataKey="timestamp"
                                tickFormatter={formatTime}
                                interval="preserveStartEnd"
                              />
                              <YAxis domain={[0, 100]} />
                              <Tooltip
                                labelFormatter={(label) => formatTime(label)}
                                formatter={(value, name) => [
                                  typeof value === 'number' ? value.toFixed(0) : value,
                                  name
                                ]}
                                contentStyle={{ color: 'black' }}
                              />
                              <Line
                                type="monotone"
                                dataKey="calmValue"
                                name="Calm"
                                stroke="#81D4FA" // Light blue for Calm
                                strokeWidth={2}
                                dot={false}
                              />
                              <Line
                                type="monotone"
                                dataKey="frustratedValue"
                                name="Frustration"
                                stroke="#FF0000" // Red for Frustration
                                strokeWidth={2}
                                dot={false}
                              />
                              <Line
                                type="monotone"
                                dataKey="excitedValue"
                                name="Excitement"
                                stroke="#00FF63" // Green for Excitement
                                strokeWidth={2}
                                dot={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center border rounded-md bg-accent/5">
                            <p className="text-center text-sm text-muted-foreground">
                              Indicator data not available for this day.
                            </p>
                          </div>
                        )}
                      </div>

                      <br></br>
                      <div className="bg-accent/10 rounded-lg p-4 space-y-4">
                        <div className="text-sm space-y-1">
                          <h4 className="font-medium text-lg">Daily Insights</h4>
                        </div>
                        
                        {dailyInsights && (
                          <div className="grid grid-cols-3 gap-4">
                            {/* Column 1: Emotion Visualization with Toggle */}
                            <div className="flex flex-col items-center justify-center space-y-4">
                              <div className="flex justify-center mb-2">
                                <ToggleGroup
                                  type="single"
                                  value={emotionDisplayMode}
                                  onValueChange={(value: 'avatar' | 'range') => value && setEmotionDisplayMode(value)}
                                  className="justify-center"
                                >
                                  <ToggleGroupItem value="avatar" aria-label="Avatar View" className="text-xs px-2 py-1 h-auto">
                                    Avatar
                                  </ToggleGroupItem>
                                  <ToggleGroupItem value="range" aria-label="Color Range View" className="text-xs px-2 py-1 h-auto">
                                    Color Range
                                  </ToggleGroupItem>
                                </ToggleGroup>
                              </div>
                              
                              {emotionDisplayMode === 'avatar' ? (
                                <EmotionAvatar 
                                  flowStats={dailyInsights.flowIntensity}
                                  heartRateStats={dailyInsights.heartRate}
                                  correlation={dailyInsights.correlation}
                                  frustratedIndicatorValue={dailyInsights.frustratedIndicatorValue}
                                  excitedIndicatorValue={dailyInsights.excitedIndicatorValue}
                                  calmIndicatorValue={dailyInsights.calmIndicatorValue}
                                  width={150}
                                  height={150}
                                />
                              ) : (
                                <>
                                  <div className="mt-4 w-full">
                                    <DayGradient 
                                      timePoints={timelineData} 
                                      width={200}
                                      height={200}
                                    />
                                  </div>
                                </>
                              )}
                            </div>
                            
                            {/* Column 2: Flow Intensity */}
                            <div className="space-y-2">
                              <h5 className="font-medium text-sm text-muted-foreground">Flow Intensity</h5>
                              <div className="text-sm space-y-1">
                                <p>Average: {Math.round(dailyInsights.flowIntensity.average)}%</p>
                                <p>Peak: {Math.round(dailyInsights.flowIntensity.peak)}%</p>
                                <p>Stability: {Math.round(dailyInsights.flowIntensity.stability)}%</p>
                                <p>Peak Time: {formatTime(dailyInsights.flowIntensity.peakTime)}</p>
                                <p>Deviation: {Math.round(dailyInsights.flowIntensity.deviation)}%</p>
                              </div>
                            </div>
                            
                            {/* Column 3: Heart Rate */}
                            <div className="space-y-2">
                              <h5 className="font-medium text-sm text-muted-foreground">Heart Rate</h5>
                              <div className="text-sm space-y-1">
                                <p>Average: {Math.round(dailyInsights.heartRate.average)} bpm</p>
                                <p>Peak: {Math.round(dailyInsights.heartRate.peak)} bpm</p>
                                <p>Stability: {Math.round(dailyInsights.heartRate.stability)}%</p>
                                <p>Peak Time: {formatTime(dailyInsights.heartRate.peakTime)}</p>
                                <p>Deviation: {Math.round(dailyInsights.heartRate.deviation)} bpm</p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {dailyInsights && (
                          <div className="space-y-2 mt-4">
                            {/* Emotion Timeline - Full width */}
                            <div className="w-full">
                              <div className="flex justify-between items-center mb-2">
                                <h6 className="text-sm font-medium">Emotion Timeline</h6>
                              </div>
                              {isTimelineLoading ? (
                                <div className="w-full h-[200px] flex items-center justify-center">
                                  <div className="animate-spin h-5 w-5 border-2 border-accent border-t-transparent rounded-full" />
                                </div>
                              ) : timelineData.length === 0 ? (
                                <div className="w-full h-[150px] flex items-center justify-center border rounded-md bg-accent/5">
                                  <div className="text-center text-sm text-muted-foreground">
                                    <p>No timeline data available for this day</p>
                                    <button 
                                      className="text-xs text-accent underline mt-2"
                                      onClick={() => {
                                        console.log("Manually generating fallback timeline data");
                                        const fallbackData = generateFallbackTimelineData(new Date(selectedDay));
                                        setTimelineData(fallbackData);
                                      }}
                                    >
                                      Generate sample timeline
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <EmotionTimeline 
                                  timePoints={timelineData}
                                  width={800}
                                />
                              )}
                            </div>
                            
                            <h5 className="font-medium text-sm text-muted-foreground mt-4">Key Insights</h5>
                            <ul className="list-disc list-inside text-sm space-y-1">
                              {dailyInsights.keyInsights.map((insight, index) => (
                                <li key={index}>{insight}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col items-center space-y-2 border-t border-b py-4 border-sidebar-border">
                <h3 className="text-lg font-medium">Data Analysis</h3>
                <p className="text-sm text-muted-foreground text-center mb-2">
                  Compare flow and heart rate patterns
                </p>
                <Button 
                  onClick={runSimilarityAnalysis}
                  className="bg-accent hover:bg-accent/80 px-6 py-2 text-lg h-auto font-medium transition-all shadow-md hover:shadow-lg"
                  size="lg"
                  disabled={isLoading || !(flowData.length > 0 && heartRateData.length > 0)}
                >
                  {isLoading ? (
                    <>
                      <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-5 w-5 mr-2" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" 
                        />
                      </svg>
                      Find Similar Days
                    </>
                  )}
                </Button>
                {!(flowData.length > 0 && heartRateData.length > 0) && (
                  <p className="text-xs text-muted-foreground italic">
                    Select flow or heart rate data first to enable analysis
                  </p>
                )}
              </div>

              <AnimatePresence>
                {showAnalysisResults && analysisResults && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex justify-between items-center">
                      <h2 className="text-lg font-semibold">Similarity Analysis Results</h2>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowAnalysisResults(false)}
                      >
                        Hide
                      </Button>
                    </div>
                    
                    {Object.entries(analysisResults).map(([key, dataset]: [string, any]) => (
                      <motion.div 
                        key={key}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-accent/10 rounded-lg"
                      >
                        <h3 className="font-medium mb-2" style={{ color: dataset.color }}>
                          {dataset.datasetName} Patterns
                        </h3>
                        
                        {dataset.similarities.length > 0 ? (
                          <div className="space-y-2">
                            {dataset.similarities.map((pair: any, index: number) => (
                              <div key={index} className="flex items-center justify-between bg-background/50 p-3 rounded-md">
                                <div className="flex-1">
                                  <span className="font-medium">{pair.day1}</span> and <span className="font-medium">{pair.day2}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <span>{pair.value1}</span>
                                  <span>≈</span>
                                  <span>{pair.value2}</span>
                                  <span className="text-xs text-muted-foreground">
                                    (diff: {pair.difference.toFixed(1)})
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm">Not enough data available for comparison</p>
                        )}
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Analysis Complexity:</span>
                  <ToggleGroup
                    type="single"
                    value={readingLevel}
                    onValueChange={(value: ReadingLevel) => value && setReadingLevel(value)}
                    className="justify-end"
                  >
                    <ToggleGroupItem value="eli5" aria-label="ELI5">
                      ELI5
                    </ToggleGroupItem>
                    <ToggleGroupItem value="eli15" aria-label="ELI15">
                      ELI15
                    </ToggleGroupItem>
                    <ToggleGroupItem value="high-school" aria-label="High School">
                      High School
                    </ToggleGroupItem>
                    <ToggleGroupItem value="college" aria-label="College">
                      College
                    </ToggleGroupItem>
                    <ToggleGroupItem value="phd" aria-label="PhD">
                      PhD
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
                
                <motion.div 
                  className="p-4 bg-accent/10 rounded-lg"
                  key={`${selectedDataset}-${readingLevel}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <p>{SAMPLE_DATA[selectedDataset].description[readingLevel]}</p>
                </motion.div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </main>

      <div className="w-80 border-l border-sidebar-border bg-sidebar-background p-4 neural-bg">
        <h2 className="mb-4 text-lg font-semibold">Analysis Progress</h2>
        
        <AnimatePresence>
          {actions.map((action) => (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="mb-3"
            >
              <div className="rounded-lg border border-sidebar-border bg-background/50 p-3">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className={`h-2 w-2 rounded-full ${
                      action.type === "processing" ? "bg-yellow-500 animate-pulse" :
                      action.type === "complete" ? "bg-accent" :
                      "bg-blue-500"
                    }`} />
                  </div>
                  <span className="text-sm font-medium">{action.description}</span>
                </div>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {action.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DataAnalysis;
