import { useState, useEffect, useRef } from "react";
import { Command } from "@shared/schema";
import { useWebSocket } from "@/hooks/use-websocket";

interface TerminalOutputProps {
  currentCommand: Command | null;
}

interface OutputLine {
  timestamp: Date;
  text: string;
  type: 'output' | 'error' | 'info';
}

export default function TerminalOutput({ currentCommand }: TerminalOutputProps) {
  const [output, setOutput] = useState<OutputLine[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  const { lastMessage } = useWebSocket('/ws');

  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage);
        
        switch (data.type) {
          case 'output':
            if (data.commandId === currentCommand?.id) {
              setOutput(prev => [...prev, {
                timestamp: new Date(),
                text: data.data,
                type: 'output'
              }]);
            }
            break;
            
          case 'completed':
            if (data.commandId === currentCommand?.id) {
              setIsExecuting(false);
              setOutput(prev => [...prev, {
                timestamp: new Date(),
                text: `Command completed with exit code ${data.exitCode} in ${data.executionTime}ms`,
                type: 'info'
              }]);
            }
            break;
            
          case 'error':
            if (data.commandId === currentCommand?.id) {
              setIsExecuting(false);
              setOutput(prev => [...prev, {
                timestamp: new Date(),
                text: `Error: ${data.error}`,
                type: 'error'
              }]);
            }
            break;
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    }
  }, [lastMessage, currentCommand?.id]);

  useEffect(() => {
    if (currentCommand) {
      setIsExecuting(currentCommand.status === 'running');
      setOutput([{
        timestamp: new Date(),
        text: `Executing: ${currentCommand.generatedCommand}`,
        type: 'info'
      }]);
    }
  }, [currentCommand]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const getStatusColor = () => {
    if (isExecuting) return 'warning';
    if (currentCommand?.status === 'success') return 'success';
    if (currentCommand?.status === 'error') return 'error';
    return 'secondary';
  };

  const getStatusText = () => {
    if (isExecuting) return 'Executing command...';
    if (currentCommand?.status === 'success') return 'Command executed successfully';
    if (currentCommand?.status === 'error') return 'Command execution failed';
    return 'Ready';
  };

  const copyOutput = () => {
    const text = output.map(line => line.text).join('\n');
    navigator.clipboard.writeText(text);
  };

  const clearOutput = () => {
    setOutput([]);
  };

  return (
    <div className="flex-1 flex flex-col bg-dark">
      <div className="bg-surface px-6 py-3 border-b border-border-default">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold flex items-center space-x-2">
            <i className="fas fa-terminal text-primary"></i>
            <span>Terminal Output</span>
          </h3>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2" data-testid="status-execution">
              <div className={`w-2 h-2 bg-${getStatusColor()} rounded-full ${isExecuting ? 'animate-pulse' : ''}`}></div>
              <span className={`text-sm text-${getStatusColor()}`}>
                {getStatusText()}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <button 
                onClick={copyOutput}
                className="p-2 text-text-secondary hover:text-text-primary transition-colors" 
                title="Copy output"
                data-testid="button-copy-output"
              >
                <i className="fas fa-copy text-sm"></i>
              </button>
              <button 
                onClick={clearOutput}
                className="p-2 text-text-secondary hover:text-text-primary transition-colors" 
                title="Clear output"
                data-testid="button-clear-output"
              >
                <i className="fas fa-trash text-sm"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div 
        ref={outputRef}
        className="flex-1 overflow-y-auto p-6 font-mono text-sm" 
        data-testid="terminal-output"
      >
        {currentCommand && (
          <div className="mb-4 p-3 bg-surface-light border border-border-default rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary">
                Executing command at {currentCommand.createdAt && new Date(currentCommand.createdAt).toLocaleString()}
              </span>
              {currentCommand.status === 'running' && (
                <span className="text-xs px-2 py-1 bg-warning/20 text-warning rounded">
                  <i className="fas fa-spinner fa-spin mr-1"></i>
                  Running
                </span>
              )}
            </div>
            <code className="text-primary" data-testid="text-current-command">
              $ {currentCommand.generatedCommand}
            </code>
          </div>
        )}

        {output.length === 0 ? (
          <div className="text-center text-text-secondary py-8">
            <i className="fas fa-terminal text-3xl mb-4"></i>
            <p>Terminal output will appear here when commands are executed</p>
          </div>
        ) : (
          <div className="space-y-1">
            {output.map((line, index) => (
              <div 
                key={index} 
                className={`${
                  line.type === 'error' ? 'text-error' : 
                  line.type === 'info' ? 'text-text-secondary' : 
                  'text-text-primary'
                }`}
                data-testid={`output-line-${index}`}
              >
                {line.text}
              </div>
            ))}
            
            {isExecuting && (
              <div className="flex items-center mt-4">
                <span className="text-primary">$ </span>
                <div className="w-2 h-5 bg-text-primary ml-1 animate-pulse"></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
