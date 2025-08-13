import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface CommandGeneration {
  command: string;
  explanation: string;
  riskLevel: 'low' | 'medium' | 'high';
  requiresConfirmation: boolean;
}

export class AIService {
  async generateCommand(plainTextInput: string, systemInfo?: string): Promise<CommandGeneration> {
    try {
      const systemPrompt = `You are an expert Linux/Unix system administrator. Your task is to convert plain English requests into safe, accurate shell commands.

Rules:
1. Generate only safe, commonly used commands
2. Avoid destructive commands without explicit confirmation
3. Provide clear explanations
4. Assess risk level (low/medium/high)
5. Flag commands that need confirmation
6. Consider the system context if provided

System Info: ${systemInfo || 'Ubuntu/Debian-based system'}

Respond with JSON in this exact format:
{
  "command": "the shell command",
  "explanation": "clear explanation of what the command does",
  "riskLevel": "low|medium|high", 
  "requiresConfirmation": true|false
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: plainTextInput }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        command: result.command || '',
        explanation: result.explanation || '',
        riskLevel: result.riskLevel || 'medium',
        requiresConfirmation: result.requiresConfirmation || false,
      };
    } catch (error) {
      throw new Error(`Failed to generate command: ${(error as Error).message}`);
    }
  }

  async analyzeError(command: string, output: string, exitCode: number): Promise<string> {
    try {
      const prompt = `Analyze this command execution failure and provide a helpful explanation and potential solution:

Command: ${command}
Exit Code: ${exitCode}
Output: ${output}

Provide a clear, actionable explanation of what went wrong and how to fix it.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      });

      return response.choices[0].message.content || 'Unable to analyze error';
    } catch (error) {
      return `Error analysis failed: ${(error as Error).message}`;
    }
  }

  getQuickAction(action: string): CommandGeneration {
    const quickActions: Record<string, CommandGeneration> = {
      'system-info': {
        command: 'uname -a && cat /etc/os-release && free -h && df -h',
        explanation: 'Display system information including kernel version, OS details, memory usage, and disk space',
        riskLevel: 'low',
        requiresConfirmation: false,
      },
      'disk-usage': {
        command: 'df -h && du -sh /var/log /tmp /home',
        explanation: 'Show disk space usage for the entire system and specific directories',
        riskLevel: 'low',
        requiresConfirmation: false,
      },
      'processes': {
        command: 'ps aux --sort=-%cpu | head -20',
        explanation: 'Display the top 20 processes sorted by CPU usage',
        riskLevel: 'low',
        requiresConfirmation: false,
      },
      'network': {
        command: 'ip addr show && ss -tulpn',
        explanation: 'Show network interfaces and listening ports',
        riskLevel: 'low',
        requiresConfirmation: false,
      },
    };

    return quickActions[action] || {
      command: 'echo "Unknown quick action"',
      explanation: 'Unknown quick action requested',
      riskLevel: 'low',
      requiresConfirmation: false,
    };
  }
}

export const aiService = new AIService();
