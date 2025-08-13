import { SSHConnection } from "@shared/schema";
import { History } from "lucide-react";

interface HeaderProps {
  activeConnection?: SSHConnection;
  onOpenSSHModal: () => void;
  onOpenCommandHistory: () => void;
}

export default function Header({ activeConnection, onOpenSSHModal, onOpenCommandHistory }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-surface border-b border-border-default px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <i className="fas fa-terminal text-primary text-xl"></i>
            <h1 className="text-xl font-semibold">AI Terminal Assistant</h1>
          </div>
          
          {activeConnection ? (
            <div className="flex items-center space-x-2 px-3 py-1 bg-success/20 border border-success/30 rounded-md">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
              <span className="text-sm text-success font-medium">
                Connected to {activeConnection.name}
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 px-3 py-1 bg-error/20 border border-error/30 rounded-md">
              <div className="w-2 h-2 bg-error rounded-full"></div>
              <span className="text-sm text-error font-medium">
                No connection
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {activeConnection && (
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <i className="fas fa-server"></i>
              <span>{activeConnection.host}</span>
              <span>|</span>
              <span>{activeConnection.username}@{activeConnection.name}</span>
            </div>
          )}

          <button 
            onClick={onOpenCommandHistory}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md hover:bg-gray-700 transition-colors text-white"
          >
            <History className="w-4 h-4" />
            <span className="text-sm">History</span>
          </button>

          <button 
            onClick={onOpenSSHModal}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md hover:bg-gray-700 transition-colors text-white"
            data-testid="button-ssh-keys"
          >
            <i className="fas fa-key"></i>
            <span className="text-sm">SSH Keys</span>
          </button>

          <button className="p-2 bg-gray-800 border border-gray-700 rounded-md hover:bg-gray-700 transition-colors">
            <i className="fas fa-cog text-gray-400"></i>
          </button>
        </div>
      </div>
    </header>
  );
}
