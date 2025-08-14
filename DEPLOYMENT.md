# Deployment Guide

## Deploying to Render

Your AI terminal assistant app can be deployed to Render securely by using environment variables for SSH private keys.

### Secure SSH Key Configuration

**Important:** Never include private keys in your code repository. Always use environment variables for sensitive data.

#### Option 1: Using SSH_PRIVATE_KEY Environment Variable (Recommended for Production)

1. **Prepare your private key:**
   - Get your SSH private key content (usually from `~/.ssh/id_rsa` or `~/.ssh/id_ed25519`)
   - Copy the entire key including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`

2. **Set up environment variables in Render:**
   - Go to your Render service settings
   - Add environment variable: `SSH_PRIVATE_KEY`
   - Paste your complete private key as the value
   - **Important:** When copying the key, make sure to preserve line breaks properly

3. **Key format example:**
   ```
   SSH_PRIVATE_KEY=-----BEGIN OPENSSH PRIVATE KEY-----
   b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABFwAAAAdzc2gtcn
   ... (your key content) ...
   -----END OPENSSH PRIVATE KEY-----
   ```

#### Option 2: SSH Agent (Local Development)

For local development, you can use SSH agent:
```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/your_private_key
```

### How the App Prioritizes SSH Authentication

The app tries authentication methods in this order:

1. **SSH_PRIVATE_KEY environment variable** (best for production)
2. **SSH Agent** (good for local development)
3. **Private key file** (fallback for testing)

### Environment Variables Required

```bash
# Required
DATABASE_URL=your_postgres_connection_string
SSH_PRIVATE_KEY=your_private_key_content

# Optional (if using AI features)
OPENAI_API_KEY=your_openai_api_key
```

### Security Best Practices

1. **Never commit private keys to Git**
2. **Use environment variables for all sensitive data**
3. **Limit SSH key permissions on target servers**
4. **Regularly rotate SSH keys**
5. **Use key-specific users on target servers (not root)**

### Testing SSH Connection

After deployment, test your SSH connection by:

1. Creating an SSH connection in the app
2. The app will automatically try `SSH_PRIVATE_KEY` first
3. Check logs to see which authentication method succeeded

### Common Issues

**SSH connection fails:**
- Verify your private key format is correct
- Ensure the corresponding public key is in `~/.ssh/authorized_keys` on the target server
- Check that the target server allows key-based authentication

**Environment variable not working:**
- Ensure line breaks are preserved in the private key
- Verify the environment variable name is exactly `SSH_PRIVATE_KEY`
- Check Render logs for connection attempts

### Sample Render Configuration

```yaml
# render.yaml (optional)
services:
  - type: web
    name: ai-terminal-assistant
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: SSH_PRIVATE_KEY
        sync: false  # Set manually in Render dashboard
      - key: DATABASE_URL
        fromDatabase:
          name: your-postgres-db
          property: connectionString
```