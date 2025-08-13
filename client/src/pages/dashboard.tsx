import { useState } from "react";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import CommandInput from "@/components/command-input";
import TerminalOutput from "@/components/terminal-output";
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
        
        <main className="flex-1 flex flex-col">
          <CommandInput 
            activeConnection={activeConnection}
            onCommandCreated={setCurrentCommand}
          />
          
          <TerminalOutput currentCommand={currentCommand} />
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
