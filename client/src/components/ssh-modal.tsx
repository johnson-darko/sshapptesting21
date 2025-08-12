import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { SSHConnection, InsertSSHConnection, SSHKey, InsertSSHKey } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SSHModalProps {
  isOpen: boolean;
  onClose: () => void;
  connections: SSHConnection[];
}

export default function SSHModal({ isOpen, onClose, connections }: SSHModalProps) {
  const [newConnection, setNewConnection] = useState<InsertSSHConnection>({
    name: "",
    host: "",
    port: 22,
    username: "",
  });
  
  const [newSSHKey, setNewSSHKey] = useState<InsertSSHKey>({
    name: "",
    publicKey: "",
    keyType: "rsa",
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sshKeys = [] } = useQuery<SSHKey[]>({
    queryKey: ['/api/ssh-keys'],
  });

  const createConnectionMutation = useMutation({
    mutationFn: async (data: InsertSSHConnection) => {
      const response = await apiRequest('POST', '/api/ssh-connections', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ssh-connections'] });
      setNewConnection({
        name: "",
        host: "",
        port: 22,
        username: "",
      });
      toast({
        title: "Connection Added",
        description: "SSH connection has been added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Add Connection",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const connectMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const response = await apiRequest('POST', `/api/ssh-connections/${connectionId}/connect`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ssh-connections'] });
      toast({
        title: "Connected",
        description: "Successfully connected to SSH server",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createSSHKeyMutation = useMutation({
    mutationFn: async (data: InsertSSHKey) => {
      const response = await apiRequest('POST', '/api/ssh-keys', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ssh-keys'] });
      setNewSSHKey({
        name: "",
        publicKey: "",
        keyType: "rsa",
      });
      toast({
        title: "SSH Key Added",
        description: "Your public key has been added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Add SSH Key",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteSSHKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const response = await apiRequest('DELETE', `/api/ssh-keys/${keyId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ssh-keys'] });
      toast({
        title: "SSH Key Removed",
        description: "SSH key has been removed from your account",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Remove SSH Key",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (data: InsertSSHConnection) => {
      const response = await apiRequest('POST', '/api/ssh-connections/test', data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.valid ? "Connection Successful" : "Connection Failed",
        description: data.valid ? "SSH connection test successful using your configured SSH keys" : "Unable to connect. Make sure your SSH keys are properly configured",
        variant: data.valid ? "default" : "destructive",
      });
    },
    onError: (error) => {
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateConnection = () => {
    if (!newConnection.name || !newConnection.host || !newConnection.username) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    createConnectionMutation.mutate(newConnection);
  };

  const handleCreateSSHKey = () => {
    if (!newSSHKey.name || !newSSHKey.publicKey) {
      toast({
        title: "Missing Information",
        description: "Please provide both a name and your public key",
        variant: "destructive",
      });
      return;
    }
    createSSHKeyMutation.mutate(newSSHKey);
  };

  const handleTestConnection = () => {
    testConnectionMutation.mutate(newConnection);
  };

  const handleConnect = (connectionId: string) => {
    connectMutation.mutate(connectionId);
  };

  const handleDeleteSSHKey = (keyId: string) => {
    deleteSSHKeyMutation.mutate(keyId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden bg-surface border-border-default">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-text-primary">SSH Key Management</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="ssh-keys" className="h-full">
          <TabsList className="grid w-full grid-cols-3 bg-surface-light">
            <TabsTrigger value="ssh-keys" data-testid="tab-ssh-keys">SSH Keys</TabsTrigger>
            <TabsTrigger value="connections" data-testid="tab-connections">Connections</TabsTrigger>
            <TabsTrigger value="add-new" data-testid="tab-add-new">Add New</TabsTrigger>
          </TabsList>

          <TabsContent value="ssh-keys" className="mt-6 overflow-y-auto max-h-96">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-text-primary">Your SSH Public Keys</h3>
                <div className="text-sm text-text-secondary">
                  Keys: {sshKeys.length}
                </div>
              </div>
              
              <div className="bg-surface-light border border-border-default rounded-lg p-4">
                <div className="flex items-start space-x-2 mb-3">
                  <i className="fas fa-info-circle text-primary text-sm mt-1"></i>
                  <div className="text-sm text-text-secondary">
                    <p className="mb-2">
                      <strong>How to generate SSH keys (GitHub style):</strong>
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>Open your terminal and run: <code className="bg-dark px-1 py-0.5 rounded text-primary">ssh-keygen -t ed25519 -C "your_email@example.com"</code></li>
                      <li>Press Enter to accept the default file location</li>
                      <li>Copy your public key: <code className="bg-dark px-1 py-0.5 rounded text-primary">cat ~/.ssh/id_ed25519.pub</code></li>
                      <li>Paste the public key below (starts with ssh-ed25519 or ssh-rsa)</li>
                    </ol>
                  </div>
                </div>
              </div>

              {sshKeys.length === 0 ? (
                <div className="text-center py-8 text-text-secondary">
                  <i className="fas fa-key text-3xl mb-4"></i>
                  <p>No SSH keys configured</p>
                  <p className="text-sm mt-2">Add your first SSH key to connect to servers</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sshKeys.map((key) => (
                    <div key={key.id} className="bg-surface-light border border-border-default rounded-lg p-4" data-testid={`ssh-key-${key.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-text-primary">{key.name}</div>
                          <div className="text-sm text-text-secondary">
                            {key.keyType.toUpperCase()} • {key.fingerprint}
                          </div>
                          <div className="text-xs text-text-secondary mt-1">
                            Added {key.createdAt && new Date(key.createdAt).toLocaleDateString()}
                            {key.lastUsed && ` • Last used ${new Date(key.lastUsed).toLocaleDateString()}`}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${key.isActive ? 'bg-success' : 'bg-secondary'}`}></div>
                            <span className={`text-sm ${key.isActive ? 'text-success' : 'text-text-secondary'}`}>
                              {key.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <Button
                            onClick={() => handleDeleteSSHKey(key.id)}
                            disabled={deleteSSHKeyMutation.isPending}
                            size="sm"
                            variant="destructive"
                            data-testid={`button-delete-key-${key.id}`}
                          >
                            {deleteSSHKeyMutation.isPending ? (
                              <i className="fas fa-spinner fa-spin mr-2"></i>
                            ) : (
                              <i className="fas fa-trash mr-2"></i>
                            )}
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="connections" className="mt-6 overflow-y-auto max-h-96">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-text-primary">Available SSH Connections</h3>
              
              {connections.length === 0 ? (
                <div className="text-center py-8 text-text-secondary">
                  <i className="fas fa-server text-3xl mb-4"></i>
                  <p>No SSH connections configured</p>
                  <p className="text-sm mt-2">Add a new connection to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {connections.map((connection) => (
                    <div key={connection.id} className="bg-surface-light border border-border-default rounded-lg p-4" data-testid={`connection-${connection.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-text-primary">{connection.name}</div>
                          <div className="text-sm text-text-secondary">
                            {connection.username}@{connection.host}:{connection.port}
                          </div>
                          <div className="text-xs text-text-secondary mt-1">
                            Key: {connection.keyPath}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${connection.isActive ? 'bg-success' : 'bg-secondary'}`}></div>
                            <span className={`text-sm ${connection.isActive ? 'text-success' : 'text-text-secondary'}`}>
                              {connection.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          {!connection.isActive && (
                            <Button
                              onClick={() => handleConnect(connection.id)}
                              disabled={connectMutation.isPending}
                              size="sm"
                              className="bg-primary hover:bg-primary/90"
                              data-testid={`button-connect-${connection.id}`}
                            >
                              {connectMutation.isPending ? (
                                <i className="fas fa-spinner fa-spin mr-2"></i>
                              ) : (
                                <i className="fas fa-plug mr-2"></i>
                              )}
                              Connect
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="add-new" className="mt-6">
            <Tabs defaultValue="add-key" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 bg-surface-light">
                <TabsTrigger value="add-key">Add SSH Key</TabsTrigger>
                <TabsTrigger value="add-connection">Add Server Connection</TabsTrigger>
              </TabsList>

              <TabsContent value="add-key" className="space-y-4">
                <h3 className="text-lg font-medium text-text-primary">Add New SSH Public Key</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="key-name" className="text-text-secondary">Key Name</Label>
                    <Input
                      id="key-name"
                      value={newSSHKey.name}
                      onChange={(e) => setNewSSHKey(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., My Laptop, Work Desktop"
                      className="bg-surface-light border-border-default text-text-primary"
                      data-testid="input-ssh-key-name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="public-key" className="text-text-secondary">Public Key</Label>
                    <Textarea
                      id="public-key"
                      value={newSSHKey.publicKey}
                      onChange={(e) => setNewSSHKey(prev => ({ ...prev, publicKey: e.target.value }))}
                      placeholder="Paste your public key here (starts with ssh-ed25519, ssh-rsa, etc.)"
                      className="bg-surface-light border-border-default text-text-primary font-mono text-sm min-h-24"
                      rows={4}
                      data-testid="textarea-public-key"
                    />
                    <div className="text-xs text-text-secondary">
                      Get your public key with: <code className="bg-dark px-1 py-0.5 rounded text-primary">cat ~/.ssh/id_ed25519.pub</code> or <code className="bg-dark px-1 py-0.5 rounded text-primary">cat ~/.ssh/id_rsa.pub</code>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={handleCreateSSHKey}
                      disabled={createSSHKeyMutation.isPending}
                      className="bg-primary hover:bg-primary/90"
                      data-testid="button-add-ssh-key"
                    >
                      {createSSHKeyMutation.isPending ? (
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                      ) : (
                        <i className="fas fa-plus mr-2"></i>
                      )}
                      Add SSH Key
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="add-connection" className="space-y-4">
                <h3 className="text-lg font-medium text-text-primary">Add Server Connection</h3>
                
                <div className="bg-surface-light border border-border-default rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <i className="fas fa-info-circle text-primary text-sm mt-1"></i>
                    <div className="text-sm text-text-secondary">
                      <p>This creates a server connection that will use your configured SSH keys for authentication.</p>
                      <p className="mt-2">Make sure you have added your SSH keys first in the "SSH Keys" tab.</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="connection-name" className="text-text-secondary">Connection Name</Label>
                    <Input
                      id="connection-name"
                      value={newConnection.name}
                      onChange={(e) => setNewConnection(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Production Server"
                      className="bg-surface-light border-border-default text-text-primary"
                      data-testid="input-connection-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="host" className="text-text-secondary">Host</Label>
                    <Input
                      id="host"
                      value={newConnection.host}
                      onChange={(e) => setNewConnection(prev => ({ ...prev, host: e.target.value }))}
                      placeholder="192.168.1.100 or server.example.com"
                      className="bg-surface-light border-border-default text-text-primary"
                      data-testid="input-host"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="port" className="text-text-secondary">Port</Label>
                    <Input
                      id="port"
                      type="number"
                      value={newConnection.port}
                      onChange={(e) => setNewConnection(prev => ({ ...prev, port: parseInt(e.target.value) || 22 }))}
                      placeholder="22"
                      className="bg-surface-light border-border-default text-text-primary"
                      data-testid="input-port"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-text-secondary">Username</Label>
                    <Input
                      id="username"
                      value={newConnection.username}
                      onChange={(e) => setNewConnection(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="ubuntu, ec2-user, root"
                      className="bg-surface-light border-border-default text-text-primary"
                      data-testid="input-username"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border-default">
                  <Button
                    onClick={handleTestConnection}
                    disabled={testConnectionMutation.isPending}
                    variant="outline"
                    className="border-border-default text-text-primary hover:bg-surface-light"
                    data-testid="button-test-connection"
                  >
                    {testConnectionMutation.isPending ? (
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                    ) : (
                      <i className="fas fa-plug mr-2"></i>
                    )}
                    Test Connection
                  </Button>
                  
                  <Button
                    onClick={handleCreateConnection}
                    disabled={createConnectionMutation.isPending}
                    className="bg-primary hover:bg-primary/90"
                    data-testid="button-add-connection"
                  >
                    {createConnectionMutation.isPending ? (
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                    ) : (
                      <i className="fas fa-plus mr-2"></i>
                    )}
                    Add Connection
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
