import { Client } from 'ssh2';
import { createHash } from 'crypto';
import fs from 'fs/promises';
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
      const trimmed = publicKeyContent.trim();
      const parts = trimmed.split(/\s+/);
      
      // SSH public keys should have at least 2 parts: type and data
      if (parts.length < 2) {
        return null;
      }

      const keyTypePrefix = parts[0];
      const keyData = parts[1];
      
      // Validate key type prefix
      const validKeyTypes = ['ssh-rsa', 'ssh-ed25519', 'ssh-dss', 'ecdsa-sha2-nistp256', 'ecdsa-sha2-nistp384', 'ecdsa-sha2-nistp521'];
      if (!validKeyTypes.includes(keyTypePrefix)) {
        return null;
      }

      // Extract key type without ssh- prefix
      const keyType = keyTypePrefix.replace('ssh-', '').replace('ecdsa-sha2-', 'ecdsa-');
      
      // Basic validation of key data
      if (!keyData || keyData.length === 0) {
        return null;
      }
      
      // Simple base64 validation - just check if it looks like base64
      if (!/^[A-Za-z0-9+/]+=*$/.test(keyData)) {
        return null;
      }
      
      return {
        keyType,
        fingerprint: this.generateFingerprint(trimmed)
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate SSH key fingerprint (SHA256)
   */
  private generateFingerprint(publicKey: string): string {
    try {
      const parts = publicKey.trim().split(/\s+/);
      const keyData = parts[1];
      
      if (!keyData) {
        throw new Error('No key data found for fingerprint generation');
      }
      
      // Decode the base64 key data and generate SHA256 hash
      const keyBuffer = Buffer.from(keyData, 'base64');
      const hash = createHash('sha256').update(keyBuffer).digest('base64');
      return `SHA256:${hash}`;
    } catch (error) {
      console.error('Fingerprint generation error:', error.message);
      // Fallback fingerprint using simple hash
      const simpleHash = createHash('sha256').update(publicKey).digest('hex').substring(0, 16);
      return `SHA256:${simpleHash}`;
    }
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
      // Check if SSH agent is available
      const sshAuthSock = process.env.SSH_AUTH_SOCK;
      if (!sshAuthSock) {
        console.log('No SSH agent found (SSH_AUTH_SOCK not set)');
        return false;
      }

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

        client.on('error', (err) => {
          console.log('SSH connection error:', err.message);
          clearTimeout(timeout);
          resolve(false);
        });

        // Use SSH agent authentication - this will use keys from user's local SSH agent
        client.connect({
          host: connection.host,
          port: connection.port || 22,
          username: connection.username,
          agent: sshAuthSock,
          agentForward: true,
          readyTimeout: 10000,
        });
      });
    } catch (error) {
      console.log('SSH agent connection failed:', (error as Error).message);
      return false;
    }
  }

  /**
   * Connect to server using private key file (for testing)
   */
  async connectWithPrivateKey(connection: SSHConnection, privateKeyPath: string): Promise<boolean> {
    try {
      const privateKey = await fs.readFile(privateKeyPath);
      const client = new Client();
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          client.end();
          resolve(false);
        }, 10000);

        client.on('ready', () => {
          clearTimeout(timeout);
          this.connections.set(connection.id, client);
          resolve(true);
        });

        client.on('error', (err) => {
          console.log('SSH private key connection error:', err.message);
          clearTimeout(timeout);
          resolve(false);
        });

        // Use private key authentication
        client.connect({
          host: connection.host,
          port: connection.port || 22,
          username: connection.username,
          privateKey,
          readyTimeout: 10000,
        });
      });
    } catch (error) {
      console.log('SSH private key connection failed:', (error as Error).message);
      return false;
    }
  }

  /**
   * Test connection with deployed public keys
   */
  async testConnectionWithKeys(connection: SSHConnection): Promise<boolean> {
    try {
      // Check if SSH agent is available
      const sshAuthSock = process.env.SSH_AUTH_SOCK;
      if (!sshAuthSock) {
        console.log('No SSH agent found for testing connection');
        return false;
      }

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

        client.on('error', (err) => {
          console.log('SSH test connection error:', err.message);
          clearTimeout(timeout);
          resolve(false);
        });

        // Test connection using SSH agent (user's local keys)
        client.connect({
          host: connection.host,
          port: connection.port || 22,
          username: connection.username,
          agent: sshAuthSock,
          readyTimeout: 10000,
        });
      });
    } catch (error) {
      console.log('SSH test connection failed:', (error as Error).message);
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