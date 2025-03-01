import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import DynamicSidebar from "@/components/DynamicSidebar";
import { Brain, Heart, FileText, Layout, Cpu, MessageSquare, Settings } from "lucide-react";
import { Link } from "react-router-dom";

const actionTiles = [
  {
    title: "Data Analysis",
    description: "Analyze and visualize your data with powerful tools",
    icon: Layout,
    color: "bg-purple-500/10 text-purple-500",
    path: "/data-analysis"
  },
  {
    title: "Report Generator",
    description: "Create comprehensive reports automatically",
    icon: FileText,
    color: "bg-blue-500/10 text-blue-500",
    path: "/report-generator"
  },
  {
    title: "Mindfulness Meditation",
    description: "Brain-activity-aware meditation sessions",
    icon: Brain,
    color: "bg-orange-500/10 text-orange-500",
    path: "/mindfulness-meditation"
  },
  {
    title: "Task Automation",
    description: "Automate repetitive workflows",
    icon: Cpu,
    color: "bg-green-500/10 text-green-500",
    path: "/task-automation"
  },
  {
    title: "Chat with Your Data",
    description: "Experience personalized responses optimized by your brain activity patterns",
    icon: MessageSquare,
    color: "bg-pink-500/10 text-pink-500",
    path: "/chat"
  },
  {
    title: "Settings",
    description: "Configure your BCI device (fNIRS) and personalization preferences",
    icon: Settings,
    color: "bg-gray-500/10 text-gray-500",
    path: "/settings"
  },
  {
    title: "Golf Stroke Analysis",
    description: "Analyze flow intensity and heart rate changes around golf strokes",
    icon: Heart,
    color: "bg-teal-500/10 text-teal-500",
    path: "/golf-analysis"
  },
];

const Index = () => {
  return (
    <div className="flex min-h-screen w-full">
      <DynamicSidebar />
      <main className="flex-1 p-6 neural-bg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Personalize with BCI</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Experience adaptive interfaces powered by your brain activity. Use voice commands or select a tool below to get started.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {actionTiles.map((tile, index) => (
              <Link key={index} to={tile.path} className="h-full">
                <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-[1.02] border-2 hover:border-accent h-full">
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-lg ${tile.color} flex items-center justify-center mb-4`}>
                      <tile.icon className="w-6 h-6" />
                    </div>
                    <CardTitle className="flex items-center gap-2">
                      {tile.title}
                    </CardTitle>
                    <CardDescription>{tile.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
