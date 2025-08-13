import { useState } from "react";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import CommandInput from "@/components/command-input";
import TerminalOutput from "@/components/terminal-output";
import QuickActionsPanel from "@/components/quick-actions-panel";
import SSHModal from "@/components/ssh-modal";
import { useQuery } from "@tanstack/react-query";
import { SSHConnection, Command } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Dashboard() {
  const [isSSHModalOpen, setIsSSHModalOpen] = useState(false);
  const [currentCommand, setCurrentCommand] = useState<Command | null>(null);
  const [activeTab, setActiveTab] = useState("ai-assistant");

  const { data: connections = [] } = useQuery<SSHConnection[]>({
    queryKey: ['/api/ssh-connections'],
  });

  const { data: commands = [] } = useQuery<Command[]>({
    queryKey: ['/api/commands'],
  });

  const activeConnection = connections.find(conn => conn.isActive);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Header 
        activeConnection={activeConnection}
        onOpenSSHModal={() => setIsSSHModalOpen(true)}
      />
      
      <div className="flex h-screen pt-16">
        <Sidebar commands={commands} />
        
        <main className="flex-1 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto my-4">
                <TabsTrigger value="ai-assistant" data-testid="tab-ai-assistant">
                  🤖 AI Assistant
                </TabsTrigger>
                <TabsTrigger value="quick-actions" data-testid="tab-quick-actions">
                  ⚡ Quick Actions
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="ai-assistant" className="flex-1 flex flex-col m-0">
              <CommandInput 
                activeConnection={activeConnection}
                onCommandCreated={setCurrentCommand}
              />
              <TerminalOutput currentCommand={currentCommand} />
            </TabsContent>

            <TabsContent value="quick-actions" className="flex-1 m-0">
              <QuickActionsPanel 
                activeConnection={activeConnection}
                onCommandCreated={setCurrentCommand}
              />
            </TabsContent>
          </Tabs>
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
