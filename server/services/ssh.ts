import { Client } from 'ssh2';
import fs from 'fs/promises';
import { SSHConnection } from '@shared/schema';

export interface SSHExecutionResult {
  output: string;
  exitCode: number;
  error?: string;
}

export class SSHService {
  private connections: Map<string, Client> = new Map();

  async connect(connection: SSHConnection, privateKeyPath: string): Promise<boolean> {
    try {
      const client = new Client();
      const privateKey = await fs.readFile(privateKeyPath);

      return new Promise((resolve, reject) => {
        client.on('ready', () => {
          this.connections.set(connection.id, client);
          resolve(true);
        });

        client.on('error', (err) => {
          reject(err);
        });

        client.connect({
          host: connection.host,
          port: connection.port || 22,
          username: connection.username,
          privateKey,
        });
      });
    } catch (error) {
      throw new Error(`Failed to connect to SSH server: ${(error as Error).message}`);
    }
  }

  async executeCommand(
    connectionId: string,
    command: string,
    onData?: (data: string) => void
  ): Promise<SSHExecutionResult> {
    const client = this.connections.get(connectionId);
    if (!client) {
      throw new Error('SSH connection not found');
    }

    return new Promise((resolve, reject) => {
      let output = '';
      let exitCode = 0;

      client.exec(command, (err, stream) => {
        if (err) {
          reject(new Error(`Failed to execute command: ${err.message}`));
          return;
        }

        stream.on('close', (code: number) => {
          exitCode = code || 0;
          resolve({ output, exitCode });
        });

        stream.on('data', (data: Buffer) => {
          const chunk = data.toString();
          output += chunk;
          if (onData) {
            onData(chunk);
          }
        });

        stream.stderr.on('data', (data: Buffer) => {
          const chunk = data.toString();
          output += chunk;
          if (onData) {
            onData(chunk);
          }
        });
      });
    });
  }

  async testConnection(connection: Omit<SSHConnection, 'id' | 'userId' | 'isActive' | 'createdAt'>, privateKeyPath: string): Promise<boolean> {
    try {
      const client = new Client();
      const privateKey = await fs.readFile(privateKeyPath);

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          client.end();
          resolve(false);
        }, 10000); // 10 second timeout

        client.on('ready', () => {
          clearTimeout(timeout);
          client.end();
          resolve(true);
        });

        client.on('error', () => {
          clearTimeout(timeout);
          resolve(false);
        });

        client.connect({
          host: connection.host,
          port: connection.port || 22,
          username: connection.username,
          privateKey,
        });
      });
    } catch {
      return false;
    }
  }

  disconnect(connectionId: string): void {
    const client = this.connections.get(connectionId);
    if (client) {
      client.end();
      this.connections.delete(connectionId);
    }
  }

  disconnectAll(): void {
    for (const [id, client] of this.connections) {
      client.end();
    }
    this.connections.clear();
  }
}

export const sshService = new SSHService();
