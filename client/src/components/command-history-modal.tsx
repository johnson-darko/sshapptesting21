import { Command } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { History, Search, Trash2, Clock, CheckCircle, XCircle, Loader } from "lucide-react";

interface CommandHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[];
}

export default function CommandHistoryModal({ isOpen, onClose, commands }: CommandHistoryModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-500';
      case 'error': return 'text-red-500';
      case 'running': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4" />;
      case 'error': return <XCircle className="w-4 h-4" />;
      case 'running': return <Loader className="w-4 h-4 animate-spin" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const filteredCommands = commands.filter(command =>
    command.plainTextInput.toLowerCase().includes(searchQuery.toLowerCase()) ||
    command.generatedCommand.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <History className="w-5 h-5" />
            Command History
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search commands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
            />
          </div>

          {/* Commands List */}
          <div className="h-96 w-full border border-gray-700 rounded-md overflow-auto">
            <div className="p-4">
              {filteredCommands.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No commands found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCommands.map((command) => (
                    <div 
                      key={command.id} 
                      className="p-4 border border-gray-700 rounded-lg hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-xs text-gray-400">
                          {command.createdAt && formatDistanceToNow(new Date(command.createdAt), { addSuffix: true })}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className={getStatusColor(command.status)}>
                            {getStatusIcon(command.status)}
                          </div>
                          <span className={`text-xs capitalize ${getStatusColor(command.status)}`}>
                            {command.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm text-gray-400">Plain English:</span>
                          <p className="text-sm text-white">{command.plainTextInput}</p>
                        </div>
                        
                        <div>
                          <span className="text-sm text-gray-400">Command:</span>
                          <code className="block text-sm font-mono text-blue-400 bg-gray-800 p-2 rounded mt-1 break-all">
                            {command.generatedCommand}
                          </code>
                        </div>
                        
                        {command.aiExplanation && (
                          <div>
                            <span className="text-sm text-gray-400">AI Explanation:</span>
                            <p className="text-sm text-gray-300 italic">{command.aiExplanation}</p>
                          </div>
                        )}
                        
                        {command.exitCode !== null && (
                          <div className="text-xs text-gray-400 flex items-center gap-4">
                            <span>Exit code: {command.exitCode}</span>
                            {command.executionTime && <span>Execution: {command.executionTime}ms</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-700">
            <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-800">
              <Trash2 className="w-4 h-4 mr-2" />
              Clear History
            </Button>
            <span className="text-sm text-gray-400">
              {filteredCommands.length} of {commands.length} commands
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}