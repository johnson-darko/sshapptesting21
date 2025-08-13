import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { SSHConnection, Command } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CommandInputProps {
  activeConnection?: SSHConnection;
  onCommandCreated: (command: Command) => void;
}

interface CommandGeneration {
  command: string;
  explanation: string;
  riskLevel: 'low' | 'medium' | 'high';
  requiresConfirmation: boolean;
}

export default function CommandInput({ activeConnection, onCommandCreated }: CommandInputProps) {
  const [input, setInput] = useState("");
  const [directCommand, setDirectCommand] = useState("");
  const [generatedCommand, setGeneratedCommand] = useState<CommandGeneration | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const generateMutation = useMutation({
    mutationFn: async (plainText: string) => {
      const response = await apiRequest('POST', '/api/generate-command', { plainText });
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedCommand(data);
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createCommandMutation = useMutation({
    mutationFn: async (data: { plainTextInput: string; generatedCommand: string; aiExplanation: string; connectionId: string }) => {
      const response = await apiRequest('POST', '/api/commands', data);
      return response.json();
    },
    onSuccess: (command) => {
      queryClient.invalidateQueries({ queryKey: ['/api/commands'] });
      onCommandCreated(command);
      setInput("");
      setGeneratedCommand(null);
    },
    onError: (error) => {
      toast({
        title: "Command Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const executeCommandMutation = useMutation({
    mutationFn: async (commandId: string) => {
      const response = await apiRequest('POST', `/api/commands/${commandId}/execute`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/commands'] });
      toast({
        title: "Command Executed",
        description: "Command has been sent for execution",
      });
    },
    onError: (error) => {
      toast({
        title: "Execution Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const quickActionMutation = useMutation({
    mutationFn: async (action: string) => {
      const response = await apiRequest('GET', `/api/quick-actions/${action}`);
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedCommand(data);
      setInput(`Quick action: ${data.explanation}`);
    },
  });

  const handleGenerate = () => {
    if (!input.trim()) return;
    generateMutation.mutate(input);
  };

  const handleExecute = async () => {
    if (!generatedCommand || !activeConnection) return;

    const command = await createCommandMutation.mutateAsync({
      plainTextInput: input,
      generatedCommand: generatedCommand.command,
      aiExplanation: generatedCommand.explanation,
      connectionId: activeConnection.id,
    });

    executeCommandMutation.mutate(command.id);
  };

  const handleDirectExecute = async () => {
    if (!directCommand.trim() || !activeConnection) return;

    const command = await createCommandMutation.mutateAsync({
      plainTextInput: `Direct command: ${directCommand}`,
      generatedCommand: directCommand,
      aiExplanation: "Direct command execution (no AI processing)",
      connectionId: activeConnection.id,
    });

    executeCommandMutation.mutate(command.id);
    setDirectCommand("");
  };

  const handleQuickAction = (action: string) => {
    quickActionMutation.mutate(action);
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
      default: return 'secondary';
    }
  };

  if (!activeConnection) {
    return (
      <div className="bg-surface border-b border-border-default p-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-text-secondary">
            <i className="fas fa-exclamation-triangle text-2xl mb-2"></i>
            <p>Please connect to an SSH server to use the AI assistant</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border-b border-border-default p-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <i className="fas fa-terminal text-primary"></i>
          <span>Command Interface</span>
        </h2>
        
        <Tabs defaultValue="ai" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ai" data-testid="tab-ai-assistant">AI Assistant</TabsTrigger>
            <TabsTrigger value="direct" data-testid="tab-direct-command">Direct Command</TabsTrigger>
          </TabsList>
          
          <TabsContent value="ai" className="space-y-4">
            <div className="relative">
              <textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full bg-surface-light border border-border-default rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" 
                rows={3} 
                placeholder="Describe what you want to do in plain English... (e.g., 'Install Node.js and npm', 'Check system memory usage', 'Create a new user with sudo privileges')"
                data-testid="textarea-ai-input"
              />
              
              <div className="absolute bottom-3 right-3 flex items-center space-x-2">
                <button 
                  onClick={() => setInput("")}
                  className="p-2 text-text-secondary hover:text-text-primary transition-colors" 
                  title="Clear input"
                  data-testid="button-clear-ai-input"
                >
                  <i className="fas fa-times text-sm"></i>
                </button>
                <button 
                  onClick={handleGenerate}
                  disabled={!input.trim() || generateMutation.isPending}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors flex items-center space-x-2 disabled:opacity-50"
                  data-testid="button-generate-command"
                >
                  <i className={`fas ${generateMutation.isPending ? 'fa-spinner fa-spin' : 'fa-magic'} text-sm`}></i>
                  <span className="text-sm font-medium">
                    {generateMutation.isPending ? 'Generating...' : 'Generate Command'}
                  </span>
                </button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="direct" className="space-y-4">
            <div className="relative">
              <textarea 
                value={directCommand}
                onChange={(e) => setDirectCommand(e.target.value)}
                className="w-full bg-surface-light border border-border-default rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none font-mono" 
                rows={3} 
                placeholder="Enter your command directly... (e.g., 'ls -la', 'sudo apt update', 'docker ps')"
                data-testid="textarea-direct-input"
              />
              
              <div className="absolute bottom-3 right-3 flex items-center space-x-2">
                <button 
                  onClick={() => setDirectCommand("")}
                  className="p-2 text-text-secondary hover:text-text-primary transition-colors" 
                  title="Clear input"
                  data-testid="button-clear-direct-input"
                >
                  <i className="fas fa-times text-sm"></i>
                </button>
                <button 
                  onClick={handleDirectExecute}
                  disabled={!directCommand.trim() || createCommandMutation.isPending || executeCommandMutation.isPending}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                  data-testid="button-execute-direct"
                >
                  <i className={`fas ${(createCommandMutation.isPending || executeCommandMutation.isPending) ? 'fa-spinner fa-spin' : 'fa-play'} text-sm`}></i>
                  <span className="text-sm font-medium">
                    {(createCommandMutation.isPending || executeCommandMutation.isPending) ? 'Executing...' : 'Execute Now'}
                  </span>
                </button>
              </div>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <i className="fas fa-exclamation-triangle text-yellow-600 dark:text-yellow-400 mt-0.5"></i>
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Direct Mode:</strong> Commands execute immediately without AI safety checks. 
                  Use with caution on production servers.
                </div>
              </div>
            </div>
            
            {generatedCommand && (
          <div className="bg-surface-light border border-border-default rounded-lg p-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-text-secondary">AI Generated Command</h3>
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 bg-${getRiskColor(generatedCommand.riskLevel)} rounded-full`}></div>
                <span className={`text-xs text-${getRiskColor(generatedCommand.riskLevel)} capitalize`}>
                  {generatedCommand.riskLevel} Risk
                </span>
              </div>
            </div>
            
            <div className="bg-dark border border-border-default rounded-md p-3 mb-3">
              <code className="font-mono text-sm text-primary" data-testid="text-generated-command">
                {generatedCommand.command}
              </code>
            </div>
            
            <div className="mb-3">
              <p className="text-sm text-text-secondary mb-2">AI Explanation:</p>
              <p className="text-sm" data-testid="text-command-explanation">
                {generatedCommand.explanation}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => setGeneratedCommand(null)}
                  className="flex items-center space-x-1 px-3 py-1 bg-surface border border-border-default rounded-md hover:bg-surface-light transition-colors text-sm"
                  data-testid="button-edit-command"
                >
                  <i className="fas fa-edit text-xs"></i>
                  <span>Edit</span>
                </button>
                <button 
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending}
                  className="flex items-center space-x-1 px-3 py-1 bg-surface border border-border-default rounded-md hover:bg-surface-light transition-colors text-sm disabled:opacity-50"
                  data-testid="button-regenerate-command"
                >
                  <i className={`fas ${generateMutation.isPending ? 'fa-spinner fa-spin' : 'fa-sync'} text-xs`}></i>
                  <span>Regenerate</span>
                </button>
              </div>
              
              <button 
                onClick={handleExecute}
                disabled={createCommandMutation.isPending || executeCommandMutation.isPending}
                className="px-6 py-2 bg-success text-white rounded-md hover:bg-success/90 transition-colors flex items-center space-x-2 disabled:opacity-50"
                data-testid="button-execute-command"
              >
                <i className={`fas ${(createCommandMutation.isPending || executeCommandMutation.isPending) ? 'fa-spinner fa-spin' : 'fa-play'} text-sm`}></i>
                <span className="font-medium">
                  {(createCommandMutation.isPending || executeCommandMutation.isPending) ? 'Executing...' : 'Execute Command'}
                </span>
              </button>
            </div>
          </div>
            )}
          </TabsContent>
          
          <TabsContent value="direct" className="space-y-4">
            <div className="relative">
              <textarea 
                value={directCommand}
                onChange={(e) => setDirectCommand(e.target.value)}
                className="w-full bg-surface-light border border-border-default rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none font-mono" 
                rows={3} 
                placeholder="Enter your command directly... (e.g., 'ls -la', 'sudo apt update', 'docker ps')"
                data-testid="textarea-direct-input"
              />
              
              <div className="absolute bottom-3 right-3 flex items-center space-x-2">
                <button 
                  onClick={() => setDirectCommand("")}
                  className="p-2 text-text-secondary hover:text-text-primary transition-colors" 
                  title="Clear input"
                  data-testid="button-clear-direct-input"
                >
                  <i className="fas fa-times text-sm"></i>
                </button>
                <button 
                  onClick={handleDirectExecute}
                  disabled={!directCommand.trim() || createCommandMutation.isPending || executeCommandMutation.isPending}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                  data-testid="button-execute-direct"
                >
                  <i className={`fas ${(createCommandMutation.isPending || executeCommandMutation.isPending) ? 'fa-spinner fa-spin' : 'fa-play'} text-sm`}></i>
                  <span className="text-sm font-medium">
                    {(createCommandMutation.isPending || executeCommandMutation.isPending) ? 'Executing...' : 'Execute Now'}
                  </span>
                </button>
              </div>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <i className="fas fa-exclamation-triangle text-yellow-600 dark:text-yellow-400 mt-0.5"></i>
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Direct Mode:</strong> Commands execute immediately without AI safety checks. 
                  Use with caution on production servers.
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
