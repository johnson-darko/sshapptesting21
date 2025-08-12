import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { SSHConnection, Command } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

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
          <i className="fas fa-robot text-primary"></i>
          <span>AI Command Assistant</span>
        </h2>
        
        <div className="relative mb-4">
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full bg-surface-light border border-border-default rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" 
            rows={3} 
            placeholder="Describe what you want to do in plain English... (e.g., 'Install Node.js and npm', 'Check system memory usage', 'Create a new user with sudo privileges')"
            data-testid="textarea-command-input"
          />
          
          <div className="absolute bottom-3 right-3 flex items-center space-x-2">
            <button 
              onClick={() => setInput("")}
              className="p-2 text-text-secondary hover:text-text-primary transition-colors" 
              title="Clear input"
              data-testid="button-clear-input"
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

        {generatedCommand && (
          <div className="bg-surface-light border border-border-default rounded-lg p-4 mb-4">
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

        <div className="flex items-center space-x-2">
          <span className="text-sm text-text-secondary">Quick actions:</span>
          {['system-info', 'disk-usage', 'processes', 'network'].map((action) => (
            <button 
              key={action}
              onClick={() => handleQuickAction(action)}
              disabled={quickActionMutation.isPending}
              className="px-3 py-1 bg-surface-light border border-border-default rounded-md hover:bg-surface transition-colors text-sm disabled:opacity-50"
              data-testid={`button-quick-${action}`}
            >
              {action.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
