import { type User, type InsertUser, type SSHConnection, type InsertSSHConnection, type SSHKey, type InsertSSHKey, type Command, type InsertCommand, users, sshConnections, sshKeys, commands } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import * as crypto from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getSSHConnections(): Promise<SSHConnection[]>;
  getSSHConnection(id: string): Promise<SSHConnection | undefined>;
  createSSHConnection(connection: InsertSSHConnection): Promise<SSHConnection>;
  updateSSHConnectionStatus(id: string, isActive: boolean): Promise<void>;
  
  getSSHKeys(): Promise<SSHKey[]>;
  getSSHKey(id: string): Promise<SSHKey | undefined>;
  createSSHKey(sshKey: InsertSSHKey): Promise<SSHKey>;
  updateSSHKeyLastUsed(id: string): Promise<void>;
  deleteSSHKey(id: string): Promise<void>;
  
  getCommands(connectionId?: string): Promise<Command[]>;
  getCommand(id: string): Promise<Command | undefined>;
  createCommand(command: InsertCommand): Promise<Command>;
  updateCommandStatus(id: string, status: string): Promise<void>;
  updateCommandResult(id: string, result: { output: string; exitCode: number; status: string; executionTime: number; }): Promise<void>;
  clearCommandHistory(connectionId?: string): Promise<void>;
}

// Helper function to generate SSH key fingerprint
function generateFingerprint(publicKey: string): string {
  const keyData = publicKey.split(' ')[1] || publicKey;
  const hash = crypto.createHash('sha256').update(keyData, 'base64').digest('base64');
  return `SHA256:${hash}`;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getSSHConnections(): Promise<SSHConnection[]> {
    return await db.select().from(sshConnections);
  }

  async getSSHConnection(id: string): Promise<SSHConnection | undefined> {
    const [connection] = await db.select().from(sshConnections).where(eq(sshConnections.id, id));
    return connection || undefined;
  }

  async createSSHConnection(insertConnection: InsertSSHConnection): Promise<SSHConnection> {
    const [connection] = await db
      .insert(sshConnections)
      .values({
        ...insertConnection,
        port: insertConnection.port ?? 22,
      })
      .returning();
    return connection;
  }

  async updateSSHConnectionStatus(id: string, isActive: boolean): Promise<void> {
    if (isActive) {
      // Set all connections to inactive first
      await db.update(sshConnections).set({ isActive: false });
    }
    
    await db.update(sshConnections)
      .set({ isActive })
      .where(eq(sshConnections.id, id));
  }

  async getSSHKeys(): Promise<SSHKey[]> {
    return await db.select().from(sshKeys).where(eq(sshKeys.isActive, true));
  }

  async getSSHKey(id: string): Promise<SSHKey | undefined> {
    const [sshKey] = await db.select().from(sshKeys).where(eq(sshKeys.id, id));
    return sshKey || undefined;
  }

  async createSSHKey(insertSSHKey: InsertSSHKey & { keyType?: string }): Promise<SSHKey> {
    const fingerprint = generateFingerprint(insertSSHKey.publicKey);
    const keyType = insertSSHKey.keyType || insertSSHKey.publicKey.split(' ')[0]?.replace('ssh-', '') || 'rsa';
    
    const [sshKey] = await db
      .insert(sshKeys)
      .values({
        ...insertSSHKey,
        fingerprint,
        keyType,
        isActive: insertSSHKey.isActive ?? true,
      })
      .returning();
    return sshKey;
  }

  async updateSSHKeyLastUsed(id: string): Promise<void> {
    await db.update(sshKeys)
      .set({ lastUsed: new Date() })
      .where(eq(sshKeys.id, id));
  }

  async deleteSSHKey(id: string): Promise<void> {
    await db.update(sshKeys)
      .set({ isActive: false })
      .where(eq(sshKeys.id, id));
  }

  async getCommands(connectionId?: string): Promise<Command[]> {
    if (connectionId) {
      return await db.select().from(commands).where(eq(commands.connectionId, connectionId));
    }
    return await db.select().from(commands);
  }

  async getCommand(id: string): Promise<Command | undefined> {
    const [command] = await db.select().from(commands).where(eq(commands.id, id));
    return command || undefined;
  }

  async createCommand(insertCommand: InsertCommand): Promise<Command> {
    const [command] = await db
      .insert(commands)
      .values({
        ...insertCommand,
        connectionId: insertCommand.connectionId ?? null,
      })
      .returning();
    return command;
  }

  async updateCommandStatus(id: string, status: string): Promise<void> {
    await db.update(commands)
      .set({ status })
      .where(eq(commands.id, id));
  }

  async updateCommandResult(id: string, result: { output: string; exitCode: number; status: string; executionTime: number; }): Promise<void> {
    await db.update(commands)
      .set({
        ...result,
        completedAt: new Date(),
      })
      .where(eq(commands.id, id));
  }

  async clearCommandHistory(connectionId?: string): Promise<void> {
    if (connectionId) {
      await db.delete(commands).where(eq(commands.connectionId, connectionId));
    } else {
      await db.delete(commands);
    }
  }
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private sshConnections: Map<string, SSHConnection>;
  private sshKeys: Map<string, SSHKey>;
  private commands: Map<string, Command>;

  constructor() {
    this.users = new Map();
    this.sshConnections = new Map();
    this.sshKeys = new Map();
    this.commands = new Map();
    
    // Add some sample data for testing (will be replaced by real data)
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Only add sample data if no real data exists
    if (this.sshConnections.size === 0) {
      console.log('Initializing with sample SSH connection for testing...');
      // This helps with testing - real connections will replace this
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getSSHConnections(): Promise<SSHConnection[]> {
    return Array.from(this.sshConnections.values());
  }

  async getSSHConnection(id: string): Promise<SSHConnection | undefined> {
    return this.sshConnections.get(id);
  }

  async createSSHConnection(insertConnection: InsertSSHConnection): Promise<SSHConnection> {
    const id = randomUUID();
    const connection: SSHConnection = {
      ...insertConnection,
      id,
      userId: null,
      port: insertConnection.port ?? 22,
      isActive: false,
      createdAt: new Date(),
    };
    this.sshConnections.set(id, connection);
    return connection;
  }

  async getSSHKeys(): Promise<SSHKey[]> {
    return Array.from(this.sshKeys.values()).filter(key => key.isActive);
  }

  async getSSHKey(id: string): Promise<SSHKey | undefined> {
    return this.sshKeys.get(id);
  }

  async createSSHKey(insertSSHKey: InsertSSHKey & { keyType?: string }): Promise<SSHKey> {
    const id = randomUUID();
    const fingerprint = generateFingerprint(insertSSHKey.publicKey);
    
    // Extract key type from public key (e.g., "ssh-rsa", "ssh-ed25519") or use provided
    const keyType = insertSSHKey.keyType || insertSSHKey.publicKey.split(' ')[0]?.replace('ssh-', '') || 'rsa';
    
    const sshKey: SSHKey = {
      ...insertSSHKey,
      id,
      userId: null,
      fingerprint,
      keyType,
      isActive: insertSSHKey.isActive ?? true,
      lastUsed: null,
      createdAt: new Date(),
    };
    this.sshKeys.set(id, sshKey);
    return sshKey;
  }

  async updateSSHKeyLastUsed(id: string): Promise<void> {
    const sshKey = this.sshKeys.get(id);
    if (sshKey) {
      this.sshKeys.set(id, { ...sshKey, lastUsed: new Date() });
    }
  }

  async deleteSSHKey(id: string): Promise<void> {
    const sshKey = this.sshKeys.get(id);
    if (sshKey) {
      this.sshKeys.set(id, { ...sshKey, isActive: false });
    }
  }

  async updateSSHConnectionStatus(id: string, isActive: boolean): Promise<void> {
    const connection = this.sshConnections.get(id);
    if (connection) {
      // Set all connections to inactive first
      if (isActive) {
        for (const [connId, conn] of this.sshConnections.entries()) {
          this.sshConnections.set(connId, { ...conn, isActive: false });
        }
      }
      
      this.sshConnections.set(id, { ...connection, isActive });
    }
  }

  async getCommands(connectionId?: string): Promise<Command[]> {
    const allCommands = Array.from(this.commands.values());
    if (connectionId) {
      return allCommands.filter(cmd => cmd.connectionId === connectionId);
    }
    return allCommands.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getCommand(id: string): Promise<Command | undefined> {
    return this.commands.get(id);
  }

  async createCommand(insertCommand: InsertCommand): Promise<Command> {
    const id = randomUUID();
    const command: Command = {
      ...insertCommand,
      id,
      connectionId: insertCommand.connectionId ?? null,
      output: null,
      exitCode: null,
      status: 'pending',
      executionTime: null,
      createdAt: new Date(),
      completedAt: null,
    };
    this.commands.set(id, command);
    return command;
  }

  async updateCommandStatus(id: string, status: string): Promise<void> {
    const command = this.commands.get(id);
    if (command) {
      this.commands.set(id, { ...command, status });
    }
  }

  async updateCommandResult(id: string, result: { output: string; exitCode: number; status: string; executionTime: number; }): Promise<void> {
    const command = this.commands.get(id);
    if (command) {
      this.commands.set(id, {
        ...command,
        ...result,
        completedAt: new Date(),
      });
    }
  }

  async clearCommandHistory(connectionId?: string): Promise<void> {
    if (connectionId) {
      for (const [id, command] of this.commands.entries()) {
        if (command.connectionId === connectionId) {
          this.commands.delete(id);
        }
      }
    } else {
      this.commands.clear();
    }
  }
}

export const storage = new DatabaseStorage();
