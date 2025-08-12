import { Client } from 'ssh2';
import { storage } from '../storage';
import { SSHConnection, SSHKey } from '@shared/schema';

export interface SSHKeyExecutionResult {
  output: string;
  exitCode: number;
  error?: string;
}

export class SSHKeyService {
  private connections: Map<string, Client> = new Map();

  /**
   * Parse and validate SSH public key
   */
  parsePublicKey(publicKeyContent: string): { keyType: string; fingerprint: string } | null {
    try {
      const parts = publicKeyContent.trim().split(' ');
      if (parts.length < 2) {
        throw new Error('Invalid public key format');
      }

      const keyType = parts[0].replace('ssh-', '');
      const keyData = parts[1];
      
      // Validate base64 encoding
      Buffer.from(keyData, 'base64');
      
      return {
        keyType,
        fingerprint: this.generateFingerprint(publicKeyContent)
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate SSH key fingerprint (SHA256)
   */
  private generateFingerprint(publicKey: string): string {
    const crypto = require('crypto');
    const keyData = publicKey.split(' ')[1] || publicKey;
    const hash = crypto.createHash('sha256').update(keyData, 'base64').digest('base64');
    return `SHA256:${hash}`;
  }

  /**
   * Deploy public key to remote server's authorized_keys
   */
  async deployPublicKeyToServer(connection: SSHConnection, publicKey: string): Promise<boolean> {
    try {
      const client = new Client();
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          client.end();
          resolve(false);
        }, 15000);

        client.on('ready', () => {
          clearTimeout(timeout);
          
          // Command to add public key to authorized_keys safely
          const command = `
            mkdir -p ~/.ssh && \
            chmod 700 ~/.ssh && \
            echo "${publicKey.trim()}" >> ~/.ssh/authorized_keys && \
            chmod 600 ~/.ssh/authorized_keys && \
            sort ~/.ssh/authorized_keys | uniq > ~/.ssh/authorized_keys.tmp && \
            mv ~/.ssh/authorized_keys.tmp ~/.ssh/authorized_keys && \
            echo "Key deployed successfully"
          `;

          client.exec(command, (err, stream) => {
            if (err) {
              client.end();
              resolve(false);
              return;
            }

            let output = '';
            stream.on('close', (code: number) => {
              client.end();
              resolve(code === 0 && output.includes('Key deployed successfully'));
            });

            stream.on('data', (data: Buffer) => {
              output += data.toString();
            });

            stream.stderr.on('data', (data: Buffer) => {
              output += data.toString();
            });
          });
        });

        client.on('error', () => {
          clearTimeout(timeout);
          resolve(false);
        });

        // For Phase 1, we'll use password authentication to deploy the key
        // In production, this would be done through a secure provisioning process
        client.connect({
          host: connection.host,
          port: connection.port,
          username: connection.username,
          password: 'temporary_password', // This would be handled differently in production
        });
      });
    } catch (error) {
      return false;
    }
  }

  /**
   * Connect to server using SSH agent forwarding (for user's local keys)
   */
  async connectWithAgent(connection: SSHConnection): Promise<boolean> {
    try {
      const client = new Client();
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          client.end();
          resolve(false);
        }, 10000);

        client.on('ready', () => {
          clearTimeout(timeout);
          this.connections.set(connection.id, client);
          resolve(true);
        });

        client.on('error', () => {
          clearTimeout(timeout);
          resolve(false);
        });

        // Use SSH agent authentication - this will use keys from user's local SSH agent
        client.connect({
          host: connection.host,
          port: connection.port,
          username: connection.username,
          agent: process.env.SSH_AUTH_SOCK, // SSH agent socket
          agentForward: true,
        });
      });
    } catch (error) {
      return false;
    }
  }

  /**
   * Test connection with deployed public keys
   */
  async testConnectionWithKeys(connection: SSHConnection): Promise<boolean> {
    try {
      const client = new Client();
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          client.end();
          resolve(false);
        }, 10000);

        client.on('ready', () => {
          clearTimeout(timeout);
          client.end();
          resolve(true);
        });

        client.on('error', () => {
          clearTimeout(timeout);
          resolve(false);
        });

        // Test connection using SSH agent (user's local keys)
        client.connect({
          host: connection.host,
          port: connection.port,
          username: connection.username,
          agent: process.env.SSH_AUTH_SOCK,
        });
      });
    } catch {
      return false;
    }
  }

  /**
   * Execute command on connected server
   */
  async executeCommand(
    connectionId: string,
    command: string,
    onData?: (data: string) => void
  ): Promise<SSHKeyExecutionResult> {
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
          exitCode = code;
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

export const sshKeyService = new SSHKeyService();