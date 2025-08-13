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
      <div className="flex items-center justify-center h-full text-center p-8">
        <div>
          <div className="text-4xl mb-4">🔗</div>
          <h3 className="text-lg font-semibold mb-2">No SSH Connection</h3>
          <p className="text-muted-foreground">Connect to a server to access quick actions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6" data-testid="panel-quick-actions">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Quick Actions</h2>
        <p className="text-muted-foreground">Pre-built commands organized by category</p>
      </div>

      {categories.map((category) => (
        <Card key={category.id} className="w-full" data-testid={`card-category-${category.id}`}>
          <Collapsible 
            open={openCategories[category.id]} 
            onOpenChange={() => toggleCategory(category.id)}
          >
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{category.icon}</div>
                    <div className="text-left">
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                      <CardDescription>{category.description}</CardDescription>
                    </div>
                  </div>
                  {openCategories[category.id] ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="space-y-4">
                {category.sections.map((section) => (
                  <Card key={section.id} className="bg-muted/30" data-testid={`card-section-${section.id}`}>
                    <Collapsible 
                      open={openSections[section.id]} 
                      onOpenChange={() => toggleSection(section.id)}
                    >
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-base">{section.name}</CardTitle>
                              <CardDescription className="text-sm">{section.description}</CardDescription>
                            </div>
                            {openSections[section.id] ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <CardContent className="space-y-3 pt-0">
                          {section.commands.map((command) => (
                            <Card key={command.id} className="bg-background" data-testid={`card-command-${command.id}`}>
                              <CardContent className="p-4">
                                <div className="space-y-3">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-medium">{command.buttonText}</h4>
                                        {command.riskLevel && (
                                          <Badge variant={getRiskBadgeVariant(command.riskLevel)} className="text-xs">
                                            {getRiskIcon(command.riskLevel)}
                                            {command.riskLevel}
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-muted-foreground mb-2">{command.explanation}</p>
                                      <code className="text-xs bg-muted p-2 rounded font-mono block">
                                        {processCommand(command)}
                                      </code>
                                    </div>
                                  </div>

                                  {command.userInputs && command.userInputs.length > 0 && (
                                    <div className="space-y-3 pt-3 border-t">
                                      {command.userInputs.map((input) => (
                                        <div key={input.name} className="space-y-2">
                                          <div className="flex items-center justify-between">
                                            <Label className="text-sm font-medium">{input.description}</Label>
                                            {input.autoDetect && (
                                              <Button
                                                variant="outline"
                                                size="sm"
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
                                              <SelectTrigger data-testid={`select-${command.id}-${input.name}`}>
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
                                              placeholder={input.placeholder}
                                              value={userInputs[command.id]?.[input.name] || ''}
                                              onChange={(e) => updateUserInput(command.id, input.name, e.target.value)}
                                              data-testid={`textarea-${command.id}-${input.name}`}
                                            />
                                          ) : (
                                            <Input
                                              placeholder={input.placeholder}
                                              value={userInputs[command.id]?.[input.name] || ''}
                                              onChange={(e) => updateUserInput(command.id, input.name, e.target.value)}
                                              data-testid={`input-${command.id}-${input.name}`}
                                            />
                                          )}
                                          
                                          <p className="text-xs text-muted-foreground">
                                            Example: {input.example}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  <Button
                                    onClick={() => handleExecuteCommand(command)}
                                    disabled={createCommandMutation.isPending || executeCommandMutation.isPending}
                                    className="w-full"
                                    data-testid={`button-execute-${command.id}`}
                                  >
                                    <Play className="w-4 h-4 mr-2" />
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
  );
}