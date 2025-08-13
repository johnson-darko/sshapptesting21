import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { sshService } from "./services/ssh";
import { sshKeyService } from "./services/ssh-key";
import { aiService } from "./services/ai";
import { insertSSHConnectionSchema, insertSSHKeySchema, insertCommandSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for real-time terminal output
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  // SSH Connections endpoints
  app.get('/api/ssh-connections', async (req, res) => {
    try {
      const connections = await storage.getSSHConnections();
      res.json(connections);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post('/api/ssh-connections', async (req, res) => {
    try {
      const data = insertSSHConnectionSchema.parse(req.body);
      const connection = await storage.createSSHConnection(data);
      res.json(connection);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // SSH Keys endpoints
  app.get('/api/ssh-keys', async (req, res) => {
    try {
      const keys = await storage.getSSHKeys();
      res.json(keys);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post('/api/ssh-keys', async (req, res) => {
    try {
      const data = insertSSHKeySchema.parse(req.body);
      
      // Validate public key format
      const keyInfo = sshKeyService.parsePublicKey(data.publicKey);
      if (!keyInfo) {
        return res.status(400).json({ error: 'Invalid public key format' });
      }
      
      const sshKey = await storage.createSSHKey({
        ...data,
        keyType: keyInfo.keyType,
      });
      
      res.json(sshKey);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.delete('/api/ssh-keys/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSSHKey(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post('/api/ssh-connections/test', async (req, res) => {
    try {
      const data = insertSSHConnectionSchema.parse(req.body);
      
      // Check if SSH agent is available first
      if (!process.env.SSH_AUTH_SOCK) {
        return res.json({ 
          valid: false, 
          error: 'SSH agent not available. Please run: eval "$(ssh-agent -s)" && ssh-add ~/.ssh/your_key_name. See SSH_SETUP.md for detailed instructions.' 
        });
      }

      const testConnection: SSHConnection = {
        ...data,
        id: '',
        userId: null,
        port: data.port ?? 22,
        isActive: false,
        createdAt: new Date(),
      };
      const isValid = await sshKeyService.testConnectionWithKeys(testConnection);
      res.json({ 
        valid: isValid,
        error: isValid ? null : 'Connection test failed. Please ensure your SSH key is loaded in the SSH agent and you have access to the server.'
      });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post('/api/ssh-connections/:id/connect', async (req, res) => {
    try {
      const { id } = req.params;
      const connection = await storage.getSSHConnection(id);
      
      if (!connection) {
        console.log(`Connection not found for ID: ${id}`);
        console.log('Available connections:', Array.from((await storage.getSSHConnections()).map(c => c.id)));
        return res.status(404).json({ error: 'Connection not found. The connection may have been cleared due to server restart. Please recreate the connection.' });
      }

      // Check if SSH agent is available first
      if (!process.env.SSH_AUTH_SOCK) {
        return res.status(400).json({ 
          error: 'SSH agent not available. Please run: eval "$(ssh-agent -s)" && ssh-add ~/.ssh/your_key_name. See SSH_SETUP.md for detailed instructions.' 
        });
      }

      const success = await sshKeyService.connectWithAgent(connection);
      if (success) {
        await storage.updateSSHConnectionStatus(id, true);
        res.json({ success: true });
      } else {
        res.status(500).json({ error: 'Failed to connect. Please ensure your SSH key is loaded in the SSH agent and you have access to the server.' });
      }
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post('/api/ssh-connections/:id/disconnect', async (req, res) => {
    try {
      const { id } = req.params;
      sshKeyService.disconnect(id);
      await storage.updateSSHConnectionStatus(id, false);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // AI Command Generation
  app.post('/api/generate-command', async (req, res) => {
    try {
      const { plainText } = req.body;
      
      if (!plainText) {
        return res.status(400).json({ error: 'Plain text input required' });
      }

      const result = await aiService.generateCommand(plainText);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.get('/api/quick-actions/:action', async (req, res) => {
    try {
      const { action } = req.params;
      const result = aiService.getQuickAction(action);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Command execution
  app.post('/api/commands', async (req, res) => {
    try {
      const data = insertCommandSchema.parse(req.body);
      const command = await storage.createCommand(data);
      res.json(command);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post('/api/commands/:id/execute', async (req, res) => {
    try {
      const { id } = req.params;
      const command = await storage.getCommand(id);
      
      if (!command) {
        return res.status(404).json({ error: 'Command not found' });
      }

      // Update status to running
      await storage.updateCommandStatus(id, 'running');

      // Find WebSocket clients to stream output
      const clients = Array.from(wss.clients).filter(client => client.readyState === WebSocket.OPEN);

      const startTime = Date.now();
      
      try {
        const result = await sshKeyService.executeCommand(
          command.connectionId!,
          command.generatedCommand,
          (data) => {
            // Stream output to WebSocket clients
            clients.forEach(client => {
              client.send(JSON.stringify({
                type: 'output',
                commandId: id,
                data: data
              }));
            });
          }
        );

        const executionTime = Date.now() - startTime;
        const status = result.exitCode === 0 ? 'success' : 'error';

        await storage.updateCommandResult(id, {
          output: result.output,
          exitCode: result.exitCode,
          status,
          executionTime,
        });

        // Notify completion
        clients.forEach(client => {
          client.send(JSON.stringify({
            type: 'completed',
            commandId: id,
            exitCode: result.exitCode,
            executionTime
          }));
        });

        res.json({ success: true, exitCode: result.exitCode });
      } catch (error) {
        await storage.updateCommandStatus(id, 'error');
        
        clients.forEach(client => {
          client.send(JSON.stringify({
            type: 'error',
            commandId: id,
            error: error.message
          }));
        });

        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Command history
  app.get('/api/commands', async (req, res) => {
    try {
      const { connectionId } = req.query;
      const commands = await storage.getCommands(connectionId as string);
      res.json(commands);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.delete('/api/commands', async (req, res) => {
    try {
      const { connectionId } = req.query;
      await storage.clearCommandHistory(connectionId as string);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  return httpServer;
}
