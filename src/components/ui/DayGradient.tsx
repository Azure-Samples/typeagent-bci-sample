import { useRef, useEffect } from "react";

interface TimePoint {
  timestamp: string;
  frustratedValue: number;
  excitedValue: number;
  calmValue: number;
}

interface DayGradientProps {
  timePoints: TimePoint[];
  width?: number;
  height?: number;
}

/**
 * DayGradient - A component that visualizes a day's emotional data as concentric rings
 * Uses RGB color mapping:
 * - Red represents frustration (outer ring)
 * - Green represents excitement (middle ring)
 * - Blue represents calm (inner ring)
 */
const DayGradient: React.FC<DayGradientProps> = ({ 
  timePoints,
  width = 300,
  height = 300
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Filter out invalid points and sort timePoints by timestamp
  const sortedTimePoints = [...timePoints]
    .filter(point => point.frustratedValue > 0 || point.excitedValue > 0 || point.calmValue > 0)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || sortedTimePoints.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate aggregated emotion values
    const emotionTotals = sortedTimePoints.reduce((acc, point) => {
      return {
        frustration: acc.frustration + point.frustratedValue,
        excitement: acc.excitement + point.excitedValue,
        calm: acc.calm + point.calmValue
      };
    }, { frustration: 0, excitement: 0, calm: 0 });

    // Calculate averages
    const pointCount = sortedTimePoints.length;
    const avgFrustration = emotionTotals.frustration / pointCount;
    const avgExcitement = emotionTotals.excitement / pointCount;
    const avgCalm = emotionTotals.calm / pointCount;

    // Set up circle parameters
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = Math.min(centerX, centerY) - 20; // Leave some padding

    // Helper function to draw ring with rounded edges
    const drawRing = (
      radius: number, 
      thickness: number, 
      percentage: number, 
      color: string
    ) => {
      const startAngle = -Math.PI / 2; // Start at top
      const endAngle = startAngle + (Math.PI * 2 * (percentage / 100));
      const capRadius = thickness / 2;
      
      // Draw background ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#f0f0f0';
      ctx.lineWidth = thickness;
      ctx.stroke();
      
      // Draw filled portion with rounded caps
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.strokeStyle = color;
      ctx.lineWidth = thickness;
      ctx.stroke();

      // Draw start cap
      ctx.beginPath();
      ctx.arc(centerX + Math.cos(startAngle) * radius, centerY + Math.sin(startAngle) * radius, capRadius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Draw end cap
      ctx.beginPath();
      ctx.arc(centerX + Math.cos(endAngle) * radius, centerY + Math.sin(endAngle) * radius, capRadius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    };

    // Calculate ring dimensions
    const ringSpacing = 10;
    const ringThickness = 20;
    
    // Draw rings from outer to inner
    // Outer ring (Frustration - Red)
    drawRing(
      maxRadius, 
      ringThickness, 
      avgFrustration, 
      'rgba(255, 0, 0, 0.8)'
    );
    
    // Middle ring (Excitement - Green)
    drawRing(
      maxRadius - ringThickness - ringSpacing, 
      ringThickness, 
      avgExcitement, 
      'rgba(0, 255, 0, 0.8)'
    );
    
    // Inner ring (Calm - Blue)
    drawRing(
      maxRadius - (ringThickness + ringSpacing) * 2, 
      ringThickness, 
      avgCalm, 
      'rgba(0, 0, 255, 0.8)'
    );

  }, [sortedTimePoints, width, height]);

  // If no valid data points, don't render the component
  if (sortedTimePoints.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col items-center">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded-md"
      />
    </div>
  );
};

export default DayGradient; 