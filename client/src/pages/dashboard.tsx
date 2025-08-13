import { useState } from "react";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import CommandInput from "@/components/command-input";
import TerminalOutput from "@/components/terminal-output";
import QuickActionsPanel from "@/components/quick-actions-panel";
import SSHModal from "@/components/ssh-modal";
import { useQuery } from "@tanstack/react-query";
import { SSHConnection, Command } from "@shared/schema";

export default function Dashboard() {
  const [isSSHModalOpen, setIsSSHModalOpen] = useState(false);
  const [currentCommand, setCurrentCommand] = useState<Command | null>(null);

  const { data: connections = [] } = useQuery<SSHConnection[]>({
    queryKey: ['/api/ssh-connections'],
  });

  const { data: commands = [] } = useQuery<Command[]>({
    queryKey: ['/api/commands'],
  });

  const activeConnection = connections.find(conn => conn.isActive);

  return (
    <div className="min-h-screen bg-dark text-text-primary font-sans">
      <Header 
        activeConnection={activeConnection}
        onOpenSSHModal={() => setIsSSHModalOpen(true)}
      />
      
      <div className="flex h-screen pt-16">
        <Sidebar commands={commands} />
        
        <main className="flex-1 flex">
          {/* Left panel - AI Assistant & Terminal */}
          <div className="flex-1 flex flex-col">
            <CommandInput 
              activeConnection={activeConnection}
              onCommandCreated={setCurrentCommand}
            />
            <TerminalOutput currentCommand={currentCommand} />
          </div>
          
          {/* Right panel - Quick Actions */}
          <div className="w-96 border-l border-border-default bg-surface flex-shrink-0">
            <QuickActionsPanel 
              activeConnection={activeConnection}
              onCommandCreated={setCurrentCommand}
            />
          </div>
        </main>
      </div>

      <SSHModal 
        isOpen={isSSHModalOpen}
        onClose={() => setIsSSHModalOpen(false)}
        connections={connections}
      />
    </div>
  );
}
