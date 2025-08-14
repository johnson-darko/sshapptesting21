import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AlertTriangle, CheckCircle, XCircle, Loader, Terminal } from "lucide-react";

interface ToolInstallationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  toolName: string;
  connectionId: string;
  onInstallComplete: (success: boolean) => void;
}

export default function ToolInstallationDialog({
  isOpen,
  onClose,
  toolName,
  connectionId,
  onInstallComplete
}: ToolInstallationDialogProps) {
  const [installOutput, setInstallOutput] = useState<string>("");

  const installMutation = useMutation({
    mutationFn: async ({ toolName, connectionId }: { toolName: string; connectionId: string }) => {
      return apiRequest(`/api/tools/install`, {
        method: 'POST',
        body: JSON.stringify({
          toolName,
          connectionId,
          confirmed: true
        })
      });
    },
    onSuccess: (data) => {
      setInstallOutput(data.output || "");
      onInstallComplete(data.success);
    },
    onError: (error) => {
      console.error('Installation failed:', error);
      setInstallOutput(`Installation failed: ${error}`);
      onInstallComplete(false);
    }
  });

  const handleInstall = () => {
    setInstallOutput("");
    installMutation.mutate({ toolName, connectionId });
  };

  const handleCancel = () => {
    onClose();
    onInstallComplete(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Missing Tool Detected
          </DialogTitle>
          <DialogDescription>
            The tool <Badge variant="outline">{toolName}</Badge> is not installed on the target server.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
            <p className="text-sm text-orange-700 dark:text-orange-300">
              To proceed with the DevOps workflow, <strong>{toolName}</strong> needs to be installed first.
              This will use your system's package manager (apt, yum, dnf, or pacman).
            </p>
          </div>

          {installMutation.isPending && (
            <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
              <Loader className="h-4 w-4 animate-spin" />
              Installing {toolName}...
            </div>
          )}

          {installMutation.isSuccess && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {installMutation.data?.success ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600 dark:text-green-400">
                      {toolName} installed successfully!
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-600 dark:text-red-400">
                      Installation failed
                    </span>
                  </>
                )}
              </div>
              
              {installOutput && (
                <div className="bg-gray-50 dark:bg-gray-900 border rounded p-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Terminal className="h-3 w-3" />
                    <span className="text-xs font-medium">Installation Output:</span>
                  </div>
                  <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {installOutput.slice(0, 500)}
                    {installOutput.length > 500 && "..."}
                  </pre>
                </div>
              )}
            </div>
          )}

          {installMutation.isError && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <XCircle className="h-4 w-4" />
              Installation failed. Please check your permissions and try again.
            </div>
          )}

          <div className="flex gap-2 justify-end">
            {!installMutation.isPending && !installMutation.isSuccess && (
              <>
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleInstall}>
                  Install {toolName}
                </Button>
              </>
            )}

            {installMutation.isSuccess && (
              <Button onClick={onClose}>
                {installMutation.data?.success ? "Continue" : "Close"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}