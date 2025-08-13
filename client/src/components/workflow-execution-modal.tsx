import { useState, useRef, useEffect } from "react";
import { DevopsWorkflow, SSHConnection } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

import { 
  Play, 
  Pause, 
  Square, 
  CheckCircle, 
  XCircle, 
  Loader,
  AlertTriangle,
  Settings
} from "lucide-react";

interface WorkflowExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflow: DevopsWorkflow | null;
  activeConnection?: SSHConnection;
  onExecute: (workflow: DevopsWorkflow, variables: Record<string, string>) => void;
}

export default function WorkflowExecutionModal({ 
  isOpen, 
  onClose, 
  workflow,
  activeConnection,
  onExecute 
}: WorkflowExecutionModalProps) {
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [autoDetectedValues, setAutoDetectedValues] = useState<Record<string, string>>({});
  const [isDetecting, setIsDetecting] = useState(false);
  const executionRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  if (!workflow) return null;

  // Extract variables from workflow steps
  const extractVariables = (steps: any[]) => {
    const vars = new Set<string>();
    steps.forEach(step => {
      const matches = step.command.match(/{([^}]+)}/g);
      if (matches) {
        matches.forEach((match: string) => {
          vars.add(match.slice(1, -1));
        });
      }
    });
    return Array.from(vars);
  };

  const workflowVariables = extractVariables(workflow.steps as any[]);

  // Auto-detection functions
  const autoDetectValues = async () => {
    if (!activeConnection || !workflow) return;
    
    setIsDetecting(true);
    const detected: Record<string, string> = {};

    try {
      // Auto-detect image name from package.json or current directory
      if (workflowVariables.includes('image_name')) {
        try {
          const packageResult = await executeDetectionCommand('cat package.json 2>/dev/null | grep "name" | head -1 | sed \'s/.*"name":\\s*"\\([^"]*\\)".*/\\1/\'');
          if (packageResult) {
            detected.image_name = packageResult.toLowerCase().replace(/[^a-z0-9-]/g, '-');
          } else {
            // Fallback to current directory name
            const dirResult = await executeDetectionCommand('basename $(pwd)');
            detected.image_name = dirResult?.toLowerCase().replace(/[^a-z0-9-]/g, '-') || 'my-app';
          }
        } catch {
          detected.image_name = 'my-app';
        }
      }

      // Auto-detect port from package.json scripts or common files
      if (workflowVariables.includes('port')) {
        try {
          const portResult = await executeDetectionCommand(`
            # Check package.json for port
            grep -o '"start":[^}]*' package.json 2>/dev/null | grep -o '[0-9]\\{4,5\\}' | head -1 || 
            # Check for common server files
            grep -r "port.*[0-9]\\{4,5\\}" . --include="*.js" --include="*.ts" --include="*.json" 2>/dev/null | grep -o '[0-9]\\{4,5\\}' | head -1 ||
            # Default to 3000
            echo "3000"
          `);
          detected.port = portResult || '3000';
        } catch {
          detected.port = '3000';
        }
      }

      // Auto-detect AWS region from AWS CLI config or environment
      if (workflowVariables.includes('region')) {
        try {
          const regionResult = await executeDetectionCommand(`
            # Check AWS config
            aws configure get region 2>/dev/null ||
            # Check environment variable
            echo $AWS_REGION ||
            # Check instance metadata (if on EC2)
            curl -s http://169.254.169.254/latest/meta-data/placement/region 2>/dev/null ||
            # Default to us-east-1
            echo "us-east-1"
          `);
          detected.region = regionResult || 'us-east-1';
        } catch {
          detected.region = 'us-east-1';
        }
      }

      // Auto-detect AWS account ID
      if (workflowVariables.includes('account_id')) {
        try {
          const accountResult = await executeDetectionCommand(`
            # Get AWS account ID
            aws sts get-caller-identity --query Account --output text 2>/dev/null ||
            # Default placeholder
            echo "123456789012"
          `);
          detected.account_id = accountResult || '123456789012';
        } catch {
          detected.account_id = '123456789012';
        }
      }

      // Auto-detect Git branch
      if (workflowVariables.includes('branch_name')) {
        try {
          const branchResult = await executeDetectionCommand('git branch --show-current 2>/dev/null || echo "main"');
          detected.branch_name = branchResult || 'main';
        } catch {
          detected.branch_name = 'main';
        }
      }

      // Auto-detect commit message from last commit
      if (workflowVariables.includes('commit_message')) {
        try {
          const commitResult = await executeDetectionCommand('git log -1 --pretty=%B 2>/dev/null | head -1 || echo "Update application"');
          detected.commit_message = commitResult || 'Update application';
        } catch {
          detected.commit_message = 'Update application';
        }
      }

      // Auto-detect database name
      if (workflowVariables.includes('database_name')) {
        try {
          const dbResult = await executeDetectionCommand(`
            # Check environment variables
            echo $DATABASE_NAME || echo $PGDATABASE || echo $DB_NAME ||
            # Check package.json name
            grep '"name"' package.json 2>/dev/null | sed 's/.*"name":\\s*"\\([^"]*\\)".*/\\1/' |
            # Default
            echo "myapp_db"
          `);
          detected.database_name = dbResult || 'myapp_db';
        } catch {
          detected.database_name = 'myapp_db';
        }
      }

      setAutoDetectedValues(detected);
      setVariables(prev => ({ ...detected, ...prev })); // Don't override user input
    } catch (error) {
      console.error('Auto-detection failed:', error);
    } finally {
      setIsDetecting(false);
    }
  };

  const executeDetectionCommand = async (command: string): Promise<string | null> => {
    try {
      const result = await apiRequest(`/api/commands`, {
        method: 'POST',
        body: {
          connectionId: activeConnection!.id,
          plainTextInput: 'Auto-detection command',
          generatedCommand: command,
          aiExplanation: 'Detecting project values'
        }
      });
      return result.output?.trim() || null;
    } catch {
      return null;
    }
  };

  // Auto-detect values when workflow changes
  useEffect(() => {
    if (workflow && activeConnection && workflowVariables.length > 0) {
      autoDetectValues();
    }
  }, [workflow?.id, activeConnection?.id]);

  // Execute workflow step by step
  const executeWorkflowMutation = useMutation({
    mutationFn: async (command: string) => {
      if (!activeConnection) throw new Error('No active connection');
      
      return await apiRequest(`/api/commands`, {
        method: 'POST',
        body: {
          connectionId: activeConnection.id,
          plainTextInput: `Workflow step: ${command}`,
          generatedCommand: command,
          aiExplanation: `Executing workflow step`
        }
      });
    }
  });

  const handleExecute = async () => {
    if (!workflow || !activeConnection) {
      setExecutionLogs(prev => [...prev, 'Error: No active SSH connection']);
      return;
    }

    setIsExecuting(true);
    setIsPaused(false);
    setCurrentStep(0);
    setExecutionLogs(['Starting workflow execution...']);
    executionRef.current.cancelled = false;

    try {
      const steps = workflow.steps as any[];
      
      for (let i = 0; i < steps.length; i++) {
        if (executionRef.current.cancelled) {
          setExecutionLogs(prev => [...prev, 'Workflow execution cancelled']);
          break;
        }

        setCurrentStep(i);
        setExecutionLogs(prev => [...prev, `Step ${i + 1}: ${steps[i].description}`]);
        
        // Replace variables in command
        let command = steps[i].command;
        Object.entries(variables).forEach(([key, value]) => {
          command = command.replace(new RegExp(`{${key}}`, 'g'), value);
        });

        setExecutionLogs(prev => [...prev, `Executing: ${command}`]);

        // Wait for pause
        while (isPaused && !executionRef.current.cancelled) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (executionRef.current.cancelled) break;

        try {
          await executeWorkflowMutation.mutateAsync(command);
          setExecutionLogs(prev => [...prev, `✓ Step ${i + 1} completed successfully`]);
        } catch (error) {
          setExecutionLogs(prev => [...prev, `✗ Step ${i + 1} failed: ${error}`]);
        }

        // Small delay between steps
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (!executionRef.current.cancelled) {
        setCurrentStep(steps.length);
        setExecutionLogs(prev => [...prev, '🎉 Workflow completed successfully!']);
      }
    } catch (error) {
      setExecutionLogs(prev => [...prev, `Fatal error: ${error}`]);
    } finally {
      setIsExecuting(false);
      setIsPaused(false);
    }
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
    setExecutionLogs(prev => [...prev, isPaused ? 'Workflow resumed' : 'Workflow paused']);
  };

  const handleStop = () => {
    executionRef.current.cancelled = true;
    setIsExecuting(false);
    setIsPaused(false);
    setExecutionLogs(prev => [...prev, 'Workflow stopped by user']);
  };

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStep) return 'completed';
    if (stepIndex === currentStep && isExecuting) return 'running';
    return 'pending';
  };

  const getStepIcon = (stepIndex: number) => {
    const status = getStepStatus(stepIndex);
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'running': return <Loader className="w-4 h-4 text-blue-400 animate-spin" />;
      default: return <div className="w-4 h-4 rounded-full border-2 border-gray-500" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl">{workflow.name}</div>
              <div className="text-sm text-gray-400 font-normal">{workflow.description}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Requirements Check */}
          {workflow.requirements && (workflow.requirements as string[]).length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Required Tools</Label>
              <div className="flex flex-wrap gap-2">
                {(workflow.requirements as string[]).map((req) => (
                  <Badge key={req} variant="outline" className="border-yellow-500/30 text-yellow-400">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {req}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-gray-400">
                Make sure these tools are installed on your target server before running the workflow.
              </p>
            </div>
          )}

          {/* Variable Inputs */}
          {workflowVariables.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Configuration</Label>
                {activeConnection && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={autoDetectValues}
                    disabled={isDetecting}
                    className="border-blue-600 text-blue-400 hover:bg-blue-600/10"
                  >
                    {isDetecting ? (
                      <>
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                        Detecting...
                      </>
                    ) : (
                      <>
                        <Settings className="w-4 h-4 mr-2" />
                        Auto-detect
                      </>
                    )}
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workflowVariables.map((variable) => (
                  <div key={variable} className="space-y-2">
                    <Label htmlFor={variable} className="text-sm text-gray-300 flex items-center gap-2">
                      {variable.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      {autoDetectedValues[variable] && (
                        <Badge variant="secondary" className="text-xs bg-green-600/20 text-green-400 border-green-600/30">
                          auto-detected
                        </Badge>
                      )}
                    </Label>
                    <Input
                      id={variable}
                      placeholder={autoDetectedValues[variable] || `Enter ${variable}`}
                      value={variables[variable] || ''}
                      onChange={(e) => setVariables(prev => ({ ...prev, [variable]: e.target.value }))}
                      className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                    />
                    {autoDetectedValues[variable] && !variables[variable] && (
                      <p className="text-xs text-gray-400">
                        Suggested: {autoDetectedValues[variable]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Workflow Steps */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Workflow Steps</Label>
            <div className="space-y-3">
              {(workflow.steps as any[]).map((step, index) => (
                <div 
                  key={index} 
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    getStepStatus(index) === 'completed' 
                      ? 'border-green-500/30 bg-green-500/10' 
                      : getStepStatus(index) === 'running'
                      ? 'border-blue-500/30 bg-blue-500/10'
                      : 'border-gray-700 bg-gray-800/50'
                  }`}
                >
                  <div className="mt-0.5">
                    <div>{getStepIcon(index)}</div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{step.description}</span>
                      <Badge variant="outline" className="text-xs">
                        Step {index + 1}
                      </Badge>
                    </div>
                    <code className="block text-xs font-mono text-gray-400 bg-gray-800 p-2 rounded break-all">
                      {step.command}
                    </code>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Connection Status */}
          {!activeConnection && (
            <div className="p-4 border border-red-500/30 bg-red-500/10 rounded-lg">
              <div className="flex items-center gap-2 text-red-400">
                <XCircle className="w-4 h-4" />
                <span className="text-sm font-medium">No SSH Connection</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Please establish an SSH connection before executing workflows.
              </p>
            </div>
          )}

          {/* Progress & Logs */}
          {isExecuting && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Progress</Label>
                  <span className="text-xs text-gray-400">
                    {currentStep} of {(workflow.steps as any[]).length} steps
                  </span>
                </div>
                <Progress 
                  value={(currentStep / (workflow.steps as any[]).length) * 100} 
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Execution Log</Label>
                <div className="h-32 w-full border border-gray-700 rounded-md p-3 bg-gray-800 overflow-auto">
                  <div className="space-y-1 text-xs font-mono">
                    {executionLogs.map((log, index) => (
                      <div key={index} className="text-gray-300">{log}</div>
                    ))}
                    {executionLogs.length === 0 && (
                      <div className="text-gray-500">Waiting for execution to start...</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-700">
            <Button variant="outline" onClick={onClose} className="border-gray-600 text-gray-300">
              Close
            </Button>
            <div className="flex gap-2">
              {isExecuting ? (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handlePause}
                    className={isPaused ? "border-green-600 text-green-400" : "border-yellow-600 text-yellow-400"}
                  >
                    {isPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
                    {isPaused ? 'Resume' : 'Pause'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleStop}
                    className="border-red-600 text-red-400 hover:bg-red-600/10"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Stop
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={handleExecute}
                  disabled={workflowVariables.some(v => !variables[v]) || !activeConnection}
                  className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Execute Workflow
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}