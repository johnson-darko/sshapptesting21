import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QuickActionCategory, QuickActionSection, QuickActionCommand } from "@shared/quick-actions";
import { SSHConnection, Command } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Play, AlertTriangle, Info, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface QuickActionsPanelProps {
  activeConnection?: SSHConnection;
  onCommandCreated: (command: Command) => void;
}

interface UserInputValues {
  [key: string]: string;
}

export default function QuickActionsPanel({ activeConnection, onCommandCreated }: QuickActionsPanelProps) {
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [userInputs, setUserInputs] = useState<Record<string, UserInputValues>>({});
  const [autoDetectOptions, setAutoDetectOptions] = useState<Record<string, string[]>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery<QuickActionCategory[]>({
    queryKey: ['/api/quick-actions/categories'],
  });

  const createCommandMutation = useMutation({
    mutationFn: async (data: { plainTextInput: string; generatedCommand: string; aiExplanation: string; connectionId: string }) => {
      const response = await apiRequest('POST', '/api/commands', data);
      return response.json();
    },
    onSuccess: (command) => {
      queryClient.invalidateQueries({ queryKey: ['/api/commands'] });
      onCommandCreated(command);
    },
    onError: (error) => {
      toast({
        title: "Command Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const executeCommandMutation = useMutation({
    mutationFn: async (commandId: string) => {
      const response = await apiRequest('POST', `/api/commands/${commandId}/execute`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/commands'] });
      toast({
        title: "Command Executed",
        description: "Command has been sent for execution",
      });
    },
    onError: (error) => {
      toast({
        title: "Execution Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const autoDetectMutation = useMutation({
    mutationFn: async (command: string) => {
      const response = await apiRequest('POST', '/api/quick-actions/auto-detect', { command });
      return response.json();
    },
    onSuccess: (data, command) => {
      setAutoDetectOptions(prev => ({ ...prev, [command]: data.options }));
    },
  });

  const toggleCategory = (categoryId: string) => {
    setOpenCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }));
  };

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const updateUserInput = (commandId: string, inputName: string, value: string) => {
    setUserInputs(prev => ({
      ...prev,
      [commandId]: {
        ...prev[commandId],
        [inputName]: value
      }
    }));
  };

  const autoDetectValues = async (commandId: string, autoDetectCommand: string) => {
    await autoDetectMutation.mutateAsync(autoDetectCommand);
  };

  const processCommand = (command: QuickActionCommand): string => {
    let processedCommand = command.terminalCommand;
    
    if (command.userInputs) {
      const inputs = userInputs[command.id] || {};
      command.userInputs.forEach(input => {
        const value = inputs[input.name] || '';
        processedCommand = processedCommand.replace(`<${input.name}>`, value);
      });
    }
    
    return processedCommand;
  };

  const handleExecuteCommand = async (command: QuickActionCommand) => {
    if (!activeConnection) {
      toast({
        title: "No Connection",
        description: "Please connect to an SSH server first",
        variant: "destructive",
      });
      return;
    }

    const processedCommand = processCommand(command);
    
    // Check if all required inputs are filled
    if (command.userInputs) {
      const inputs = userInputs[command.id] || {};
      const missingInputs = command.userInputs.filter(input => !inputs[input.name]?.trim());
      
      if (missingInputs.length > 0) {
        toast({
          title: "Missing Input",
          description: `Please fill in: ${missingInputs.map(i => i.description).join(', ')}`,
          variant: "destructive",
        });
        return;
      }
    }

    const createdCommand = await createCommandMutation.mutateAsync({
      plainTextInput: `Quick Action: ${command.explanation}`,
      generatedCommand: processedCommand,
      aiExplanation: command.explanation,
      connectionId: activeConnection.id,
    });

    executeCommandMutation.mutate(createdCommand.id);
  };

  const getRiskBadgeVariant = (riskLevel?: string) => {
    switch (riskLevel) {
      case 'low': return 'default';
      case 'medium': return 'secondary';
      case 'high': return 'destructive';
      default: return 'outline';
    }
  };

  const getRiskIcon = (riskLevel?: string) => {
    switch (riskLevel) {
      case 'low': return <CheckCircle className="w-3 h-3" />;
      case 'medium': return <Info className="w-3 h-3" />;
      case 'high': return <AlertTriangle className="w-3 h-3" />;
      default: return null;
    }
  };

  if (!activeConnection) {
    return (
      <div className="flex items-center justify-center h-full text-center p-4">
        <div>
          <div className="text-2xl mb-2">🔗</div>
          <h3 className="text-sm font-semibold mb-1">No SSH Connection</h3>
          <p className="text-xs text-text-secondary">Connect to a server first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto" data-testid="panel-quick-actions">
      <div className="p-4 border-b border-border-default bg-surface-light">
        <h2 className="text-lg font-bold mb-1">Quick Actions</h2>
        <p className="text-xs text-text-secondary">Pre-built commands by category</p>
      </div>
      <div className="p-3 space-y-3">

        {categories.map((category) => (
          <Card key={category.id} className="w-full border-border-default" data-testid={`card-category-${category.id}`}>
            <Collapsible 
              open={openCategories[category.id]} 
              onOpenChange={() => toggleCategory(category.id)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-surface-light transition-colors p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="text-lg">{category.icon}</div>
                      <div className="text-left">
                        <CardTitle className="text-sm font-medium">{category.name}</CardTitle>
                        <CardDescription className="text-xs">{category.description}</CardDescription>
                      </div>
                    </div>
                    {openCategories[category.id] ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
            
              <CollapsibleContent>
                <CardContent className="space-y-2 p-3 pt-0">
                  {category.sections.map((section) => (
                    <Card key={section.id} className="bg-surface-light border-border-default/50" data-testid={`card-section-${section.id}`}>
                      <Collapsible 
                        open={openSections[section.id]} 
                        onOpenChange={() => toggleSection(section.id)}
                      >
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-surface transition-colors p-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-sm">{section.name}</CardTitle>
                                <CardDescription className="text-xs">{section.description}</CardDescription>
                              </div>
                              {openSections[section.id] ? (
                                <ChevronDown className="w-3 h-3" />
                              ) : (
                                <ChevronRight className="w-3 h-3" />
                              )}
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                      
                        <CollapsibleContent>
                          <CardContent className="space-y-2 p-2 pt-0">
                            {section.commands.map((command) => (
                              <Card key={command.id} className="bg-background border-border-default/30" data-testid={`card-command-${command.id}`}>
                                <CardContent className="p-3">
                                  <div className="space-y-2">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-1 mb-1">
                                          <h4 className="text-sm font-medium">{command.buttonText}</h4>
                                          {command.riskLevel && (
                                            <Badge variant={getRiskBadgeVariant(command.riskLevel)} className="text-xs px-1 py-0">
                                              {getRiskIcon(command.riskLevel)}
                                              <span className="ml-1">{command.riskLevel}</span>
                                            </Badge>
                                          )}
                                        </div>
                                        <p className="text-xs text-text-secondary mb-2">{command.explanation}</p>
                                        <code className="text-xs bg-surface-light p-1 rounded font-mono block">
                                          {processCommand(command)}
                                        </code>
                                      </div>
                                    </div>

                                    {command.userInputs && command.userInputs.length > 0 && (
                                      <div className="space-y-2 pt-2 border-t border-border-default/30">
                                        {command.userInputs.map((input) => (
                                          <div key={input.name} className="space-y-1">
                                            <div className="flex items-center justify-between">
                                              <Label className="text-xs font-medium">{input.description}</Label>
                                              {input.autoDetect && (
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  className="h-6 px-2 text-xs"
                                                  onClick={() => autoDetectValues(command.id, input.autoDetect!)}
                                                  disabled={autoDetectMutation.isPending}
                                                  data-testid={`button-auto-detect-${command.id}-${input.name}`}
                                                >
                                                  Auto-detect
                                                </Button>
                                              )}
                                            </div>
                                            
                                            {input.type === 'select' ? (
                                              <Select
                                                value={userInputs[command.id]?.[input.name] || ''}
                                                onValueChange={(value) => updateUserInput(command.id, input.name, value)}
                                              >
                                                <SelectTrigger className="h-7 text-xs" data-testid={`select-${command.id}-${input.name}`}>
                                                  <SelectValue placeholder={input.placeholder} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {(autoDetectOptions[input.autoDetect!] || input.options || []).map((option) => (
                                                    <SelectItem key={option} value={option}>
                                                      {option}
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                            ) : input.type === 'multiline' ? (
                                              <Textarea
                                                className="text-xs min-h-16"
                                                placeholder={input.placeholder}
                                                value={userInputs[command.id]?.[input.name] || ''}
                                                onChange={(e) => updateUserInput(command.id, input.name, e.target.value)}
                                                data-testid={`textarea-${command.id}-${input.name}`}
                                              />
                                            ) : (
                                              <Input
                                                className="h-7 text-xs"
                                                placeholder={input.placeholder}
                                                value={userInputs[command.id]?.[input.name] || ''}
                                                onChange={(e) => updateUserInput(command.id, input.name, e.target.value)}
                                                data-testid={`input-${command.id}-${input.name}`}
                                              />
                                            )}
                                            
                                            <p className="text-xs text-text-secondary">
                                              Example: {input.example}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    <Button
                                      onClick={() => handleExecuteCommand(command)}
                                      disabled={createCommandMutation.isPending || executeCommandMutation.isPending}
                                      className="w-full h-8 text-xs"
                                      data-testid={`button-execute-${command.id}`}
                                    >
                                      <Play className="w-3 h-3 mr-1" />
                                      Execute Command
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </CardContent>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>
    </div>
  );
}