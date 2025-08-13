import { useState } from "react";
import Header from "@/components/header";
import CommandInput from "@/components/command-input";
import TerminalOutput from "@/components/terminal-output";
import QuickActionsPanel from "@/components/quick-actions-panel";
import DevopsWorkflowsPanel from "@/components/devops-workflows-panel";
import SSHModal from "@/components/ssh-modal";
import CommandHistoryModal from "@/components/command-history-modal";
import WorkflowExecutionModal from "@/components/workflow-execution-modal";
import { useQuery } from "@tanstack/react-query";
import { SSHConnection, Command, DevopsWorkflow } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Dashboard() {
  const [isSSHModalOpen, setIsSSHModalOpen] = useState(false);
  const [isCommandHistoryOpen, setIsCommandHistoryOpen] = useState(false);
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<DevopsWorkflow | null>(null);
  const [currentCommand, setCurrentCommand] = useState<Command | null>(null);

  const { data: connections = [] } = useQuery<SSHConnection[]>({
    queryKey: ['/api/ssh-connections'],
  });

  const { data: commands = [] } = useQuery<Command[]>({
    queryKey: ['/api/commands'],
  });

  const activeConnection = connections.find(conn => conn.isActive);

  const handleWorkflowSelect = (workflow: DevopsWorkflow) => {
    setSelectedWorkflow(workflow);
    setIsWorkflowModalOpen(true);
  };

  const handleWorkflowExecute = (workflow: DevopsWorkflow, variables: Record<string, string>) => {
    // TODO: Implement workflow execution logic
    console.log('Executing workflow:', workflow.name, 'with variables:', variables);
    setIsWorkflowModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans">
      <Header 
        activeConnection={activeConnection}
        onOpenSSHModal={() => setIsSSHModalOpen(true)}
        onOpenCommandHistory={() => setIsCommandHistoryOpen(true)}
      />
      
      <div className="flex h-screen pt-16">
        <main className="flex-1 flex">
          {/* Left panel - AI Assistant & Terminal */}
          <div className="flex-1 flex flex-col">
            <CommandInput 
              activeConnection={activeConnection}
              onCommandCreated={setCurrentCommand}
            />
            <TerminalOutput currentCommand={currentCommand} />
          </div>
          
          {/* Right panel - Enhanced Actions */}
          <div className="w-96 border-l border-gray-700 bg-gray-800 flex-shrink-0">
            <Tabs defaultValue="quick-actions" className="h-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-800 border-gray-700 m-2">
                <TabsTrigger value="quick-actions" className="text-sm">Quick Actions</TabsTrigger>
                <TabsTrigger value="workflows" className="text-sm">DevOps Workflows</TabsTrigger>
              </TabsList>
              
              <TabsContent value="quick-actions" className="mt-0 px-4">
                <QuickActionsPanel 
                  activeConnection={activeConnection}
                  onCommandCreated={setCurrentCommand}
                />
              </TabsContent>
              
              <TabsContent value="workflows" className="mt-0 px-4">
                <DevopsWorkflowsPanel onWorkflowSelect={handleWorkflowSelect} />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      <SSHModal 
        isOpen={isSSHModalOpen}
        onClose={() => setIsSSHModalOpen(false)}
        connections={connections}
      />

      <CommandHistoryModal
        isOpen={isCommandHistoryOpen}
        onClose={() => setIsCommandHistoryOpen(false)}
        commands={commands}
      />

      <WorkflowExecutionModal
        isOpen={isWorkflowModalOpen}
        onClose={() => setIsWorkflowModalOpen(false)}
        workflow={selectedWorkflow}
        onExecute={handleWorkflowExecute}
      />
    </div>
  );
}
