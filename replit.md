# replit.md

## Overview

This is an AI-powered terminal assistant application that allows users to execute shell commands on remote servers through natural language input. The system converts plain English instructions into executable Linux commands using AI, manages SSH connections to remote servers, and provides real-time command execution with automatic error detection and self-healing capabilities. The application features a modern web interface with a terminal-like experience, command history tracking, and comprehensive documentation generation.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

**Migration to Standard Replit Environment (August 13, 2025)**
- ✅ Successfully migrated from Replit Agent to standard Replit environment
- ✅ Fixed all TypeScript compilation issues
- ✅ Express server running on port 5000 with Vite frontend integration
- ✅ WebSocket connections working for real-time terminal output
- ✅ All API endpoints responding correctly
- ✅ Added comprehensive SSH agent setup documentation (SSH_SETUP.md)
- ✅ **Migrated to PostgreSQL database** - data now persists across server restarts
- ✅ **SSH private key authentication implemented** - fallback from SSH agent working
- ✅ **SSH connection working** - server reachable and authentication successful
- ✅ **Fixed SSH connection persistence issue** - automatic reconnection when server restarts
- ✅ **Migration completed** - project fully functional in standard Replit environment
- ✅ **Final migration verification complete** - all systems operational

### SSH Configuration Issue Identified
The SSH connection error is due to missing SSH agent configuration in the Replit environment. Users need to:
1. Run `eval "$(ssh-agent -s)"` to start SSH agent
2. Add SSH keys using `ssh-add ~/.ssh/key_name`
3. Ensure public keys are deployed to target servers

This is normal for Replit environments and documented in SSH_SETUP.md.

## Recent Changes

### Project Migration (August 13, 2025)
- ✅ Successfully migrated from Replit Agent to standard Replit environment
- ✅ Fixed all TypeScript compilation issues
- ✅ Express server running on port 5000 with Vite frontend integration
- ✅ WebSocket connections working for real-time terminal output
- ✅ All API endpoints responding correctly
- ✅ Added comprehensive SSH agent setup documentation (SSH_SETUP.md)
- ⚠️ SSH agent configuration required for remote server connections

### SSH Configuration Issue Identified
The SSH connection error is due to missing SSH agent configuration in the Replit environment. Users need to:
1. Run `eval "$(ssh-agent -s)"` to start SSH agent
2. Add SSH keys using `ssh-add ~/.ssh/key_name`
3. Ensure public keys are deployed to target servers

This is normal for Replit environments and documented in SSH_SETUP.md.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite for fast development and building
- **UI Components**: Shadcn/ui component library built on Radix UI primitives for consistent, accessible design
- **Styling**: Tailwind CSS with CSS variables for theming and responsive design
- **State Management**: TanStack React Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Communication**: WebSocket integration for live terminal output streaming

### Backend Architecture
- **Framework**: Express.js with TypeScript for the REST API server
- **WebSocket Server**: Native WebSocket server for real-time terminal output streaming
- **Database ORM**: Drizzle ORM with PostgreSQL for type-safe database operations
- **Session Management**: Express sessions with PostgreSQL session store
- **Architecture Pattern**: Service-oriented architecture with separate SSH and AI service layers

### Data Storage Solutions
- **Primary Database**: PostgreSQL with Drizzle ORM for schema management and migrations
- **In-Memory Storage**: Development fallback using Map-based storage for rapid prototyping
- **Schema Design**: Normalized tables for users, SSH connections, and command execution history
- **Migration System**: Drizzle Kit for database schema versioning and deployment

### Authentication and Authorization
- **Session-based Authentication**: Express sessions with secure cookie management
- **GitHub-Style SSH Key Management**: Users upload only public keys, private keys never touch the server
- **SSH Agent Integration**: Uses local SSH agent for secure key-based authentication
- **Public Key Storage**: Secure storage of user SSH public keys with fingerprint validation
- **Connection Isolation**: User-scoped SSH connections and command execution

### AI Integration
- **AI Provider**: OpenAI GPT-4o for natural language to shell command conversion
- **Safety Features**: Risk assessment and confirmation prompts for potentially dangerous commands
- **Context Awareness**: System information integration for environment-specific command generation
- **Error Handling**: AI-powered error analysis and automatic fix suggestions

### Command Execution System
- **SSH Client**: ssh2 library for secure remote command execution
- **Real-time Output**: Streaming command output through WebSocket connections
- **Command Queue**: Asynchronous command processing with status tracking
- **Error Recovery**: Automatic dependency installation and command retry logic
- **Execution History**: Comprehensive logging of all commands, outputs, and execution metrics

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL driver for Neon database connections
- **drizzle-orm**: Type-safe ORM for database operations and query building
- **drizzle-kit**: CLI tool for database migrations and schema management
- **ssh2**: SSH client library for secure remote server connections
- **openai**: Official OpenAI API client for AI-powered command generation

### Frontend Dependencies
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/react-***: Accessible UI component primitives
- **wouter**: Lightweight React router
- **react-hook-form**: Form handling with validation
- **date-fns**: Date manipulation and formatting utilities

### Development Dependencies
- **vite**: Fast build tool and development server
- **typescript**: Type safety and enhanced developer experience
- **tailwindcss**: Utility-first CSS framework
- **tsx**: TypeScript execution for development server

### Infrastructure Dependencies
- **PostgreSQL**: Primary database for persistent data storage
- **OpenAI API**: External AI service for natural language processing
- **SSH Key Infrastructure**: RSA/ED25519 key pairs for secure server authentication