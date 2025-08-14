import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info } from "lucide-react";

interface DuplicateConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  message: string;
  suggestions: string[];
  commandName?: string;
}

export default function DuplicateConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  message,
  suggestions,
  commandName
}: DuplicateConfirmationDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-gray-900 border-gray-700 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-yellow-400">
            <AlertTriangle className="w-5 h-5" />
            Potential Duplicate Action Detected
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-300">
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {suggestions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-400">
              <Info className="w-4 h-4" />
              Alternative Actions
            </div>
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center text-xs border-gray-600 text-gray-300">
                    {index + 1}
                  </Badge>
                  <code className="text-gray-300 bg-gray-800 px-2 py-1 rounded text-xs">
                    {suggestion}
                  </code>
                </div>
              ))}
            </div>
          </div>
        )}

        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel 
            onClick={onClose}
            className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            Continue Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}