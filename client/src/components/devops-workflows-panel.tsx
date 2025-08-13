import { useState } from "react";
import { DevopsWorkflow } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Container, 
  GitBranch, 
  Cloud, 
  Settings, 
  Play, 
  Package, 
  Database,
  Server,
  Zap,
  Code
} from "lucide-react";

interface DevopsWorkflowsPanelProps {
  onWorkflowSelect: (workflow: DevopsWorkflow) => void;
}

const mockWorkflows: DevopsWorkflow[] = [
  {
    id: "1",
    name: "Build & Run Docker Container",
    description: "Build Docker image from current directory and run with automatic port mapping",
    category: "docker",
    icon: "docker",
    steps: [
      { type: "build", command: "docker build -t {image_name} .", description: "Build Docker image" },
      { type: "run", command: "docker run -d -p {port}:{port} {image_name}", description: "Run container" }
    ],
    requirements: ["docker"],
    isBuiltIn: true,
    createdAt: new Date()
  },
  {
    id: "2", 
    name: "Git: Create & Push Branch",
    description: "Create new branch, commit changes, and push to remote repository",
    category: "git",
    icon: "git-branch",
    steps: [
      { type: "branch", command: "git checkout -b {branch_name}", description: "Create new branch" },
      { type: "add", command: "git add .", description: "Stage all changes" },
      { type: "commit", command: "git commit -m '{commit_message}'", description: "Commit changes" },
      { type: "push", command: "git push origin {branch_name}", description: "Push to remote" }
    ],
    requirements: ["git"],
    isBuiltIn: true,
    createdAt: new Date()
  },
  {
    id: "3",
    name: "Deploy to AWS ECR",
    description: "Build Docker image, tag it, and push to AWS Elastic Container Registry",
    category: "aws",
    icon: "cloud",
    steps: [
      { type: "login", command: "aws ecr get-login-password --region {region} | docker login --username AWS --password-stdin {account_id}.dkr.ecr.{region}.amazonaws.com", description: "Login to ECR" },
      { type: "build", command: "docker build -t {image_name} .", description: "Build image" },
      { type: "tag", command: "docker tag {image_name}:latest {account_id}.dkr.ecr.{region}.amazonaws.com/{image_name}:latest", description: "Tag image" },
      { type: "push", command: "docker push {account_id}.dkr.ecr.{region}.amazonaws.com/{image_name}:latest", description: "Push to ECR" }
    ],
    requirements: ["docker", "aws-cli"],
    isBuiltIn: true,
    createdAt: new Date()
  },
  {
    id: "4",
    name: "Install Dependencies",
    description: "Detect project type and install dependencies automatically",
    category: "package",
    icon: "package",
    steps: [
      { type: "detect", command: "if [ -f package.json ]; then npm install; elif [ -f requirements.txt ]; then pip install -r requirements.txt; elif [ -f Gemfile ]; then bundle install; fi", description: "Auto-detect and install" }
    ],
    requirements: [],
    isBuiltIn: true,
    createdAt: new Date()
  },
  {
    id: "5",
    name: "Database Backup",
    description: "Create a backup of PostgreSQL database with timestamp",
    category: "database",
    icon: "database",
    steps: [
      { type: "backup", command: "pg_dump {database_name} > backup_$(date +%Y%m%d_%H%M%S).sql", description: "Create timestamped backup" }
    ],
    requirements: ["postgresql"],
    isBuiltIn: true,
    createdAt: new Date()
  },
  {
    id: "6",
    name: "System Health Check",
    description: "Run comprehensive system health checks and resource monitoring",
    category: "monitoring",
    icon: "server",
    steps: [
      { type: "disk", command: "df -h", description: "Check disk usage" },
      { type: "memory", command: "free -h", description: "Check memory usage" },
      { type: "cpu", command: "top -bn1 | head -20", description: "Check CPU usage" },
      { type: "services", command: "systemctl --failed", description: "Check failed services" }
    ],
    requirements: [],
    isBuiltIn: true,
    createdAt: new Date()
  }
];

const categoryIcons = {
  docker: <Container className="w-5 h-5" />,
  git: <GitBranch className="w-5 h-5" />,
  aws: <Cloud className="w-5 h-5" />,
  package: <Package className="w-5 h-5" />,
  database: <Database className="w-5 h-5" />,
  monitoring: <Server className="w-5 h-5" />,
  automation: <Zap className="w-5 h-5" />,
  general: <Code className="w-5 h-5" />
};

const categoryColors = {
  docker: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  git: "bg-orange-500/20 text-orange-400 border-orange-500/30", 
  aws: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  package: "bg-green-500/20 text-green-400 border-green-500/30",
  database: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  monitoring: "bg-red-500/20 text-red-400 border-red-500/30",
  automation: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  general: "bg-gray-500/20 text-gray-400 border-gray-500/30"
};

export default function DevopsWorkflowsPanel({ onWorkflowSelect }: DevopsWorkflowsPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = Array.from(new Set(mockWorkflows.map(w => w.category)));
  const filteredWorkflows = selectedCategory === "all" 
    ? mockWorkflows 
    : mockWorkflows.filter(w => w.category === selectedCategory);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">DevOps Workflows</h3>
        <Badge variant="outline" className="border-blue-500/30 text-blue-400">
          {filteredWorkflows.length} workflows
        </Badge>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-800 border-gray-700">
          <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
          <TabsTrigger value="docker" className="text-xs">Docker</TabsTrigger>
          <TabsTrigger value="git" className="text-xs">Git</TabsTrigger>
          <TabsTrigger value="aws" className="text-xs">AWS</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-4">
          <ScrollArea className="h-[calc(100vh-240px)]">
            <div className="space-y-3">
              {filteredWorkflows.map((workflow) => (
                <Card key={workflow.id} className="bg-gray-800/50 border-gray-700 hover:bg-gray-800 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${categoryColors[workflow.category as keyof typeof categoryColors]}`}>
                          {categoryIcons[workflow.category as keyof typeof categoryIcons]}
                        </div>
                        <div>
                          <CardTitle className="text-sm text-white">{workflow.name}</CardTitle>
                          <Badge variant="outline" className={`text-xs mt-1 ${categoryColors[workflow.category as keyof typeof categoryColors]}`}>
                            {workflow.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <CardDescription className="text-xs text-gray-400 mb-3">
                      {workflow.description}
                    </CardDescription>

                    <div className="space-y-2 mb-4">
                      <div className="text-xs text-gray-400">Steps:</div>
                      <div className="space-y-1">
                        {(workflow.steps as any[]).slice(0, 2).map((step, idx) => (
                          <div key={idx} className="text-xs text-gray-300 flex items-center gap-2">
                            <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                            {step.description}
                          </div>
                        ))}
                        {(workflow.steps as any[]).length > 2 && (
                          <div className="text-xs text-gray-500">
                            +{(workflow.steps as any[]).length - 2} more steps
                          </div>
                        )}
                      </div>
                    </div>

                    <Button 
                      onClick={() => onWorkflowSelect(workflow)}
                      size="sm" 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Play className="w-3 h-3 mr-2" />
                      Run Workflow
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}