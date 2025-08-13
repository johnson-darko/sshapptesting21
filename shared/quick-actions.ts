// Shared types for Quick Actions
export interface QuickActionCommand {
  id: string;
  buttonText: string;
  explanation: string;
  terminalCommand: string;
  userInputs?: UserInput[];
  requiresConfirmation?: boolean;
  riskLevel?: 'low' | 'medium' | 'high';
}

export interface UserInput {
  name: string;
  placeholder: string;
  description: string;
  example: string;
  validation?: string;
  type: 'text' | 'select' | 'multiline';
  options?: string[]; // For select type
  autoDetect?: string; // Command to auto-detect existing values
}

export interface QuickActionSection {
  id: string;
  name: string;
  description: string;
  commands: QuickActionCommand[];
}

export interface QuickActionCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  sections: QuickActionSection[];
}