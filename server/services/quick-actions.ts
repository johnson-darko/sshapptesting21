// Quick Actions service for categorized command templates
import { QuickActionCommand, QuickActionSection, QuickActionCategory, UserInput } from "@shared/quick-actions";

export class QuickActionsService {
  private categories: QuickActionCategory[] = [
    {
      id: 'containerization-docker',
      name: 'CONTAINERIZATION WITH DOCKER',
      description: 'Complete Docker workflow from installation to multi-container deployment',
      icon: '🐳',
      sections: [
        {
          id: 'docker-installation',
          name: 'Installing Docker on Server',
          description: 'Set up Docker environment on your Linux server',
          commands: [
            {
              id: 'install-docker',
              buttonText: 'Install Docker',
              explanation: 'Installs Docker on your Linux server',
              terminalCommand: 'sudo yum install docker -y',
              riskLevel: 'medium'
            },
            {
              id: 'start-docker',
              buttonText: 'Start Docker service',
              explanation: 'Starts Docker daemon',
              terminalCommand: 'sudo systemctl start docker'
            },
            {
              id: 'enable-docker-boot',
              buttonText: 'Enable Docker on boot',
              explanation: 'Ensures Docker starts automatically on server boot',
              terminalCommand: 'sudo systemctl enable docker'
            },
            {
              id: 'add-user-docker-group',
              buttonText: 'Add user to Docker group',
              explanation: 'Allows running Docker without sudo',
              terminalCommand: 'sudo usermod -a -G docker <USER>',
              userInputs: [
                {
                  name: 'USER',
                  placeholder: 'username',
                  description: 'Your server username',
                  example: 'ubuntu or ec2-user',
                  type: 'text'
                }
              ]
            },
            {
              id: 'test-docker-installation',
              buttonText: 'Test Docker installation',
              explanation: 'Check version & test with hello-world container',
              terminalCommand: 'docker --version && docker run hello-world'
            }
          ]
        },
        {
          id: 'docker-basics',
          name: 'Docker Images vs Containers',
          description: 'Understanding and managing Docker images and containers',
          commands: [
            {
              id: 'list-images',
              buttonText: 'List Docker images',
              explanation: 'Shows downloaded images (blueprints for containers)',
              terminalCommand: 'docker images'
            },
            {
              id: 'list-running-containers',
              buttonText: 'List running containers',
              explanation: 'Shows currently running containers',
              terminalCommand: 'docker ps'
            },
            {
              id: 'list-all-containers',
              buttonText: 'List all containers',
              explanation: 'Shows all containers, including stopped ones',
              terminalCommand: 'docker ps -a'
            },
            {
              id: 'remove-container',
              buttonText: 'Remove container',
              explanation: 'Delete a specific container',
              terminalCommand: 'docker rm <CONTAINER_NAME>',
              userInputs: [
                {
                  name: 'CONTAINER_NAME',
                  placeholder: 'container-name',
                  description: 'Name of container to remove',
                  example: 'my-app-container',
                  type: 'select',
                  autoDetect: 'docker ps -a --format "table {{.Names}}"'
                }
              ]
            }
          ]
        },
        {
          id: 'dockerfile-creation',
          name: 'Create Dockerfiles & .dockerignore',
          description: 'Set up Docker build configuration for your projects',
          commands: [
            {
              id: 'create-frontend-dockerfile',
              buttonText: 'Create frontend Dockerfile',
              explanation: 'Creates Dockerfile for React/Node.js frontend',
              terminalCommand: 'cat > <FRONTEND_PATH>/Dockerfile << EOF\nFROM node:18\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install\nCOPY . .\nEXPOSE 3000\nCMD ["npm", "start"]\nEOF',
              userInputs: [
                {
                  name: 'FRONTEND_PATH',
                  placeholder: '/path/to/frontend',
                  description: 'Folder containing frontend code',
                  example: '/home/ubuntu/myapp/frontend',
                  type: 'text'
                }
              ]
            },
            {
              id: 'create-backend-dockerfile',
              buttonText: 'Create backend Dockerfile',
              explanation: 'Creates Dockerfile for Python/Node.js backend',
              terminalCommand: 'cat > <BACKEND_PATH>/Dockerfile << EOF\nFROM python:3.11\nWORKDIR /app\nCOPY requirements.txt ./\nRUN pip install -r requirements.txt\nCOPY . .\nEXPOSE 8000\nCMD ["python", "app.py"]\nEOF',
              userInputs: [
                {
                  name: 'BACKEND_PATH',
                  placeholder: '/path/to/backend',
                  description: 'Folder containing backend code',
                  example: '/home/ubuntu/myapp/backend',
                  type: 'text'
                }
              ]
            },
            {
              id: 'create-frontend-dockerignore',
              buttonText: 'Create frontend .dockerignore',
              explanation: 'Excludes unnecessary files from Docker build',
              terminalCommand: 'cat > <FRONTEND_PATH>/.dockerignore << EOF\nnode_modules\n.env\n.DS_Store\n*.log\nEOF',
              userInputs: [
                {
                  name: 'FRONTEND_PATH',
                  placeholder: '/path/to/frontend',
                  description: 'Frontend project folder',
                  example: '/home/ubuntu/myapp/frontend',
                  type: 'text'
                }
              ]
            },
            {
              id: 'build-frontend-image',
              buttonText: 'Build frontend image',
              explanation: 'Build Docker image for frontend project',
              terminalCommand: 'docker build -t <FRONTEND_IMAGE> <FRONTEND_PATH>',
              userInputs: [
                {
                  name: 'FRONTEND_IMAGE',
                  placeholder: 'image-name',
                  description: 'Name for the new Docker image',
                  example: 'myapp-frontend',
                  type: 'text'
                },
                {
                  name: 'FRONTEND_PATH',
                  placeholder: '/path/to/frontend',
                  description: 'Frontend project folder path',
                  example: '/home/ubuntu/myapp/frontend',
                  type: 'text'
                }
              ],
              riskLevel: 'medium'
            }
          ]
        },
        {
          id: 'docker-networking',
          name: 'Running a Project with Docker',
          description: 'Deploy multi-container applications with networking',
          commands: [
            {
              id: 'create-docker-network',
              buttonText: 'Create Docker network',
              explanation: 'Creates network for container communication',
              terminalCommand: 'docker network create <NETWORK_NAME>',
              userInputs: [
                {
                  name: 'NETWORK_NAME',
                  placeholder: 'network-name',
                  description: 'Name for the new network',
                  example: 'myapp-network',
                  type: 'text'
                }
              ]
            },
            {
              id: 'run-postgres-container',
              buttonText: 'Run PostgreSQL container',
              explanation: 'Start database container with network connection',
              terminalCommand: 'docker run -d --name <DB_CONTAINER> --network <NETWORK_NAME> -e POSTGRES_PASSWORD=<PASS> -e POSTGRES_USER=<USER> -p 5432:5432 postgres',
              userInputs: [
                {
                  name: 'DB_CONTAINER',
                  placeholder: 'db-container-name',
                  description: 'Name for database container',
                  example: 'myapp-db',
                  type: 'text'
                },
                {
                  name: 'NETWORK_NAME',
                  placeholder: 'network-name',
                  description: 'Select existing network',
                  example: 'myapp-network',
                  type: 'select',
                  autoDetect: 'docker network ls --format "table {{.Name}}"'
                },
                {
                  name: 'PASS',
                  placeholder: 'database-password',
                  description: 'Password for PostgreSQL',
                  example: 'mySecurePassword123',
                  type: 'text'
                },
                {
                  name: 'USER',
                  placeholder: 'database-user',
                  description: 'Username for PostgreSQL',
                  example: 'myapp_user',
                  type: 'text'
                }
              ],
              riskLevel: 'medium'
            },
            {
              id: 'run-frontend-container',
              buttonText: 'Run frontend container',
              explanation: 'Start frontend container with port mapping',
              terminalCommand: 'docker run -d --name <FRONTEND_CONTAINER> --network <NETWORK_NAME> -p 3000:3000 <FRONTEND_IMAGE>',
              userInputs: [
                {
                  name: 'FRONTEND_CONTAINER',
                  placeholder: 'frontend-container-name',
                  description: 'Name for frontend container',
                  example: 'myapp-frontend',
                  type: 'text'
                },
                {
                  name: 'NETWORK_NAME',
                  placeholder: 'network-name',
                  description: 'Select existing network',
                  example: 'myapp-network',
                  type: 'select',
                  autoDetect: 'docker network ls --format "table {{.Name}}"'
                },
                {
                  name: 'FRONTEND_IMAGE',
                  placeholder: 'frontend-image',
                  description: 'Select built frontend image',
                  example: 'myapp-frontend:latest',
                  type: 'select',
                  autoDetect: 'docker images --format "table {{.Repository}}:{{.Tag}}"'
                }
              ]
            },
            {
              id: 'view-container-logs',
              buttonText: 'View container logs',
              explanation: 'See real-time logs from container',
              terminalCommand: 'docker logs -f <CONTAINER_NAME>',
              userInputs: [
                {
                  name: 'CONTAINER_NAME',
                  placeholder: 'container-name',
                  description: 'Select container to view logs',
                  example: 'myapp-frontend',
                  type: 'select',
                  autoDetect: 'docker ps --format "table {{.Names}}"'
                }
              ]
            }
          ]
        },
        {
          id: 'docker-compose',
          name: 'Docker Compose - Multi-Container',
          description: 'Orchestrate multiple containers with docker-compose',
          commands: [
            {
              id: 'install-docker-compose',
              buttonText: 'Install Docker Compose',
              explanation: 'Install Docker Compose for multi-container orchestration',
              terminalCommand: 'sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose && sudo chmod +x /usr/local/bin/docker-compose',
              riskLevel: 'medium'
            },
            {
              id: 'create-docker-compose',
              buttonText: 'Create docker-compose.yml',
              explanation: 'Create configuration file for multiple services',
              terminalCommand: 'cat > docker-compose.yml << EOF\nversion: \'3.8\'\nservices:\n  backend:\n    build: ./backend\n    ports:\n      - "8000:8000"\n    environment:\n      - DATABASE_URL=postgresql://user:pass@db:5432/mydb\n    depends_on:\n      - db\n  frontend:\n    build: ./frontend\n    ports:\n      - "3000:3000"\n    depends_on:\n      - backend\n  db:\n    image: postgres:13\n    environment:\n      POSTGRES_USER: user\n      POSTGRES_PASSWORD: pass\n      POSTGRES_DB: mydb\n    volumes:\n      - postgres_data:/var/lib/postgresql/data\nvolumes:\n  postgres_data:\nEOF'
            },
            {
              id: 'start-compose-services',
              buttonText: 'Start all services',
              explanation: 'Launch all containers defined in docker-compose.yml',
              terminalCommand: 'docker-compose up -d'
            },
            {
              id: 'stop-compose-services',
              buttonText: 'Stop all services',
              explanation: 'Stop and remove all containers',
              terminalCommand: 'docker-compose down'
            },
            {
              id: 'view-compose-logs',
              buttonText: 'View service logs',
              explanation: 'See logs from all services',
              terminalCommand: 'docker-compose logs -f <SERVICE_NAME>',
              userInputs: [
                {
                  name: 'SERVICE_NAME',
                  placeholder: 'service-name',
                  description: 'Service name from docker-compose.yml',
                  example: 'backend, frontend, db',
                  type: 'text'
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'system-monitoring',
      name: 'SYSTEM MONITORING & PERFORMANCE',
      description: 'Monitor server health, performance, and resource usage',
      icon: '📊',
      sections: [
        {
          id: 'basic-monitoring',
          name: 'Basic System Information',
          description: 'Essential system metrics and information',
          commands: [
            {
              id: 'system-info',
              buttonText: 'Show system info',
              explanation: 'Display system details including OS, kernel, and hardware',
              terminalCommand: 'uname -a && cat /etc/os-release'
            },
            {
              id: 'disk-usage',
              buttonText: 'Check disk usage',
              explanation: 'Show disk space usage for all mounted filesystems',
              terminalCommand: 'df -h && du -sh /var/log'
            },
            {
              id: 'memory-usage',
              buttonText: 'Check memory usage',
              explanation: 'Display RAM and swap usage',
              terminalCommand: 'free -h'
            },
            {
              id: 'cpu-info',
              buttonText: 'Show CPU information',
              explanation: 'Display CPU details and current usage',
              terminalCommand: 'lscpu && top -bn1 | grep "Cpu(s)"'
            }
          ]
        },
        {
          id: 'process-monitoring',
          name: 'Process Management',
          description: 'Monitor and manage running processes',
          commands: [
            {
              id: 'running-processes',
              buttonText: 'List running processes',
              explanation: 'Show all running processes with resource usage',
              terminalCommand: 'ps aux --sort=-%cpu | head -20'
            },
            {
              id: 'process-tree',
              buttonText: 'Show process tree',
              explanation: 'Display processes in tree format',
              terminalCommand: 'pstree -p'
            },
            {
              id: 'kill-process',
              buttonText: 'Kill process',
              explanation: 'Terminate a specific process',
              terminalCommand: 'kill -9 <PID>',
              userInputs: [
                {
                  name: 'PID',
                  placeholder: 'process-id',
                  description: 'Process ID to terminate',
                  example: '1234',
                  type: 'text'
                }
              ],
              requiresConfirmation: true,
              riskLevel: 'high'
            }
          ]
        }
      ]
    },
    {
      id: 'network-management',
      name: 'NETWORK & CONNECTIVITY',
      description: 'Network configuration, troubleshooting, and monitoring',
      icon: '🌐',
      sections: [
        {
          id: 'network-info',
          name: 'Network Information',
          description: 'Display network interfaces and connectivity',
          commands: [
            {
              id: 'network-interfaces',
              buttonText: 'Show network interfaces',
              explanation: 'Display all network interfaces and their IP addresses',
              terminalCommand: 'ip addr show && ss -tuln'
            },
            {
              id: 'test-connectivity',
              buttonText: 'Test internet connectivity',
              explanation: 'Test connection to external servers',
              terminalCommand: 'ping -c 4 8.8.8.8 && curl -I https://google.com'
            },
            {
              id: 'open-ports',
              buttonText: 'Show open ports',
              explanation: 'List all listening ports and services',
              terminalCommand: 'netstat -tulpn'
            }
          ]
        }
      ]
    }
  ];

  getCategories(): QuickActionCategory[] {
    return this.categories;
  }

  getCategory(categoryId: string): QuickActionCategory | undefined {
    return this.categories.find(cat => cat.id === categoryId);
  }

  getSection(categoryId: string, sectionId: string): QuickActionSection | undefined {
    const category = this.getCategory(categoryId);
    return category?.sections.find(section => section.id === sectionId);
  }

  getCommand(categoryId: string, sectionId: string, commandId: string): QuickActionCommand | undefined {
    const section = this.getSection(categoryId, sectionId);
    return section?.commands.find(cmd => cmd.id === commandId);
  }

  // Legacy support for old quick actions
  getQuickAction(action: string): { command: string; explanation?: string } {
    const legacyActions: Record<string, { command: string; explanation?: string }> = {
      'system-info': { command: 'uname -a && cat /etc/os-release', explanation: 'Show system information' },
      'disk-usage': { command: 'df -h && du -sh /var/log', explanation: 'Show disk usage' },
      'network': { command: 'ip addr show && ss -tuln', explanation: 'Show network information' },
      'processes': { command: 'ps aux --sort=-%cpu | head -20', explanation: 'Show running processes' },
    };

    return legacyActions[action] || { command: 'echo "Unknown action"' };
  }
}

export const quickActionsService = new QuickActionsService();