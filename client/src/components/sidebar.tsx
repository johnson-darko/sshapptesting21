import { Command } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface SidebarProps {
  commands: Command[];
}

export default function Sidebar({ commands }: SidebarProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'success';
      case 'error': return 'error';
      case 'running': return 'warning';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return 'fa-check-circle';
      case 'error': return 'fa-times-circle';
      case 'running': return 'fa-spinner fa-spin';
      default: return 'fa-clock';
    }
  };

  return (
    <aside className="w-80 bg-surface border-r border-border-default flex flex-col">
      <div className="p-4 border-b border-border-default">
        <h2 className="text-lg font-semibold mb-3">Command History</h2>
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search commands..." 
            className="w-full bg-surface-light border border-border-default rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            data-testid="input-search-commands"
          />
          <i className="fas fa-search absolute right-3 top-2.5 text-text-secondary text-sm"></i>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {commands.length === 0 ? (
          <div className="p-4 text-center text-text-secondary">
            <i className="fas fa-history text-2xl mb-2"></i>
            <p>No commands executed yet</p>
          </div>
        ) : (
          commands.map((command) => (
            <div key={command.id} className="p-3 border-b border-border-default/50 hover:bg-surface-light cursor-pointer transition-colors" data-testid={`card-command-${command.id}`}>
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs text-text-secondary">
                  {command.createdAt && formatDistanceToNow(new Date(command.createdAt), { addSuffix: true })}
                </span>
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 bg-${getStatusColor(command.status)} rounded-full`}></div>
                  <span className={`text-xs text-${getStatusColor(command.status)} capitalize`}>
                    {command.status}
                  </span>
                </div>
              </div>
              <div className="mb-1">
                <span className="text-sm text-text-secondary">Plain English:</span>
                <p className="text-sm">{command.plainTextInput}</p>
              </div>
              <div>
                <span className="text-sm text-text-secondary">Command:</span>
                <code className="text-sm font-mono text-primary break-all">
                  {command.generatedCommand}
                </code>
              </div>
              {command.exitCode !== null && (
                <div className="mt-1 text-xs text-text-secondary">
                  Exit code: {command.exitCode}
                  {command.executionTime && ` • ${command.executionTime}ms`}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-border-default">
        <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors" data-testid="button-clear-history">
          <i className="fas fa-trash text-sm"></i>
          <span className="text-sm">Clear History</span>
        </button>
      </div>
    </aside>
  );
}
