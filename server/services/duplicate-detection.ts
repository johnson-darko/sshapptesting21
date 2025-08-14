// Duplicate Detection Service
// Detects if commands/actions have already been performed to prevent conflicts

import { SSHKeyService } from './ssh-key';

export class DuplicateDetectionService {
  private sshKeyService: SSHKeyService;

  constructor(sshKeyService: SSHKeyService) {
    this.sshKeyService = sshKeyService;
  }

  // Check if Docker is already installed
  async isDockerInstalled(connectionId: string): Promise<boolean> {
    try {
      const result = await this.sshKeyService.executeCommand(connectionId, 'docker --version');
      return result.success && result.output.includes('Docker version');
    } catch {
      return false;
    }
  }

  // Check if Docker service is running
  async isDockerRunning(connectionId: string): Promise<boolean> {
    try {
      const result = await this.sshKeyService.executeCommand(connectionId, 'systemctl is-active docker');
      return result.success && result.output.trim() === 'active';
    } catch {
      return false;
    }
  }

  // Check if a Docker image exists
  async doesDockerImageExist(connectionId: string, imageName: string): Promise<boolean> {
    try {
      const result = await this.sshKeyService.executeCommand(connectionId, `docker images -q ${imageName}`);
      return result.success && result.output.trim() !== '';
    } catch {
      return false;
    }
  }

  // Check if a Docker container is running
  async isDockerContainerRunning(connectionId: string, containerName: string): Promise<boolean> {
    try {
      const result = await this.sshKeyService.executeCommand(connectionId, `docker ps --filter "name=${containerName}" --format "table {{.Names}}"`);
      return result.success && result.output.includes(containerName);
    } catch {
      return false;
    }
  }

  // Check if a package is installed (OS-aware)
  async isPackageInstalled(connectionId: string, packageName: string): Promise<boolean> {
    try {
      // Try multiple package managers
      const commands = [
        `dpkg -l | grep -i ${packageName}`,  // Debian/Ubuntu
        `rpm -qa | grep -i ${packageName}`,  // RHEL/CentOS
        `pacman -Q | grep -i ${packageName}`, // Arch
        `which ${packageName}`,              // Generic command check
        `command -v ${packageName}`          // POSIX compliant check
      ];

      for (const cmd of commands) {
        try {
          const result = await this.sshKeyService.executeCommand(connectionId, cmd);
          if (result.success && result.output.trim() !== '') {
            return true;
          }
        } catch {
          continue;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  // Check if a service is running
  async isServiceRunning(connectionId: string, serviceName: string): Promise<boolean> {
    try {
      const result = await this.sshKeyService.executeCommand(connectionId, `systemctl is-active ${serviceName}`);
      return result.success && result.output.trim() === 'active';
    } catch {
      return false;
    }
  }

  // Check if a file/directory exists
  async doesFileExist(connectionId: string, filePath: string): Promise<boolean> {
    try {
      const result = await this.sshKeyService.executeCommand(connectionId, `test -e "${filePath}" && echo "exists"`);
      return result.success && result.output.trim() === 'exists';
    } catch {
      return false;
    }
  }

  // Check if a Git repository is already initialized
  async isGitRepoInitialized(connectionId: string, path: string = '.'): Promise<boolean> {
    try {
      const result = await this.sshKeyService.executeCommand(connectionId, `cd ${path} && git status`);
      return result.success && !result.output.includes('not a git repository');
    } catch {
      return false;
    }
  }

  // Check if a database is running
  async isDatabaseRunning(connectionId: string, dbType: 'postgresql' | 'mysql' | 'redis'): Promise<boolean> {
    try {
      let command = '';
      switch (dbType) {
        case 'postgresql':
          command = 'systemctl is-active postgresql || systemctl is-active postgresql-14 || systemctl is-active postgresql-13';
          break;
        case 'mysql':
          command = 'systemctl is-active mysql || systemctl is-active mysqld';
          break;
        case 'redis':
          command = 'systemctl is-active redis || systemctl is-active redis-server';
          break;
      }
      
      const result = await this.sshKeyService.executeCommand(connectionId, command);
      return result.success && result.output.includes('active');
    } catch {
      return false;
    }
  }

  // Comprehensive duplicate check for common actions
  async checkForDuplicates(connectionId: string, command: string): Promise<{
    isDuplicate: boolean;
    message: string;
    suggestions: string[];
  }> {
    const suggestions: string[] = [];
    
    // Docker installation check
    if (command.includes('apt install docker') || command.includes('yum install docker') || command.includes('dnf install docker')) {
      const isInstalled = await this.isDockerInstalled(connectionId);
      if (isInstalled) {
        return {
          isDuplicate: true,
          message: 'Docker is already installed on this system.',
          suggestions: [
            'Check Docker version: docker --version',
            'Start Docker service: sudo systemctl start docker',
            'Check running containers: docker ps'
          ]
        };
      }
    }

    // Docker build check
    if (command.includes('docker build')) {
      const imageNameMatch = command.match(/-t\s+([^\s]+)/);
      if (imageNameMatch) {
        const imageName = imageNameMatch[1];
        const exists = await this.doesDockerImageExist(connectionId, imageName);
        if (exists) {
          return {
            isDuplicate: true,
            message: `Docker image "${imageName}" already exists.`,
            suggestions: [
              `Remove existing image: docker rmi ${imageName}`,
              `Build with new tag: docker build -t ${imageName}:v2 .`,
              `List images: docker images`
            ]
          };
        }
      }
    }

    // Docker run check
    if (command.includes('docker run')) {
      const nameMatch = command.match(/--name\s+([^\s]+)/);
      if (nameMatch) {
        const containerName = nameMatch[1];
        const isRunning = await this.isDockerContainerRunning(connectionId, containerName);
        if (isRunning) {
          return {
            isDuplicate: true,
            message: `Container "${containerName}" is already running.`,
            suggestions: [
              `Stop container: docker stop ${containerName}`,
              `View logs: docker logs ${containerName}`,
              `Run with different name: docker run --name ${containerName}-2 ...`
            ]
          };
        }
      }
    }

    // Package installation checks
    const packageMatches = [
      { pattern: /apt install ([^\s]+)/, manager: 'apt' },
      { pattern: /yum install ([^\s]+)/, manager: 'yum' },
      { pattern: /dnf install ([^\s]+)/, manager: 'dnf' },
      { pattern: /pacman -S ([^\s]+)/, manager: 'pacman' }
    ];

    for (const { pattern, manager } of packageMatches) {
      const match = command.match(pattern);
      if (match) {
        const packageName = match[1].replace(/-y$/, '').trim();
        const isInstalled = await this.isPackageInstalled(connectionId, packageName);
        if (isInstalled) {
          return {
            isDuplicate: true,
            message: `Package "${packageName}" is already installed.`,
            suggestions: [
              `Check version: ${packageName} --version`,
              `Reinstall: ${manager} reinstall ${packageName}`,
              `Update: ${manager} update ${packageName}`
            ]
          };
        }
      }
    }

    // Git initialization check
    if (command.includes('git init')) {
      const isInitialized = await this.isGitRepoInitialized(connectionId);
      if (isInitialized) {
        return {
          isDuplicate: true,
          message: 'Git repository is already initialized in this directory.',
          suggestions: [
            'Check status: git status',
            'View remotes: git remote -v',
            'Force reinit: rm -rf .git && git init'
          ]
        };
      }
    }

    // Service start checks
    const serviceMatches = command.match(/systemctl start ([^\s]+)/);
    if (serviceMatches) {
      const serviceName = serviceMatches[1];
      const isRunning = await this.isServiceRunning(connectionId, serviceName);
      if (isRunning) {
        return {
          isDuplicate: true,
          message: `Service "${serviceName}" is already running.`,
          suggestions: [
            `Check status: systemctl status ${serviceName}`,
            `Restart service: systemctl restart ${serviceName}`,
            `View logs: journalctl -u ${serviceName}`
          ]
        };
      }
    }

    return {
      isDuplicate: false,
      message: '',
      suggestions: []
    };
  }
}

let _duplicateDetectionService: DuplicateDetectionService | null = null;

export const getDuplicateDetectionService = async (): Promise<DuplicateDetectionService> => {
  if (!_duplicateDetectionService) {
    const { SSHKeyService } = await import('./ssh-key');
    _duplicateDetectionService = new DuplicateDetectionService(new SSHKeyService());
  }
  return _duplicateDetectionService;
};