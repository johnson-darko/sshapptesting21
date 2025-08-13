# SSH Setup for Replit Environment

This application requires SSH agent forwarding to connect to remote servers. Since Replit runs in a sandboxed environment, SSH agent setup requires some additional steps.

## Option 1: Use Password-Free SSH Keys (Recommended for Testing)

For testing purposes, you can generate a new SSH key pair without a passphrase:

```bash
# Generate a new SSH key
ssh-keygen -t ed25519 -f ~/.ssh/replit_key -N ""

# Start SSH agent
eval "$(ssh-agent -s)"

# Add the key to SSH agent
ssh-add ~/.ssh/replit_key

# Display public key to copy to your server
cat ~/.ssh/replit_key.pub
```

Then copy the public key to your server's `~/.ssh/authorized_keys` file.

## Option 2: Set up SSH Agent with Existing Keys

If you have existing SSH keys:

```bash
# Start SSH agent
eval "$(ssh-agent -s)"

# Add your existing key (replace with your key path)
ssh-add ~/.ssh/id_rsa  # or ~/.ssh/id_ed25519

# Verify keys are loaded
ssh-add -l
```

## Option 3: Manual Key Management (Alternative)

If SSH agent is not available, the application will need to be modified to accept private key files directly. This is less secure but works in constrained environments.

## Environment Variables

The application checks for:
- `SSH_AUTH_SOCK`: Path to SSH agent socket

## Troubleshooting

1. **"SSH agent not available"**: Run `eval "$(ssh-agent -s)"` and `ssh-add your-key`
2. **"Connection test failed"**: Ensure your public key is in the server's `~/.ssh/authorized_keys`
3. **Permission denied**: Check that the server user/host/port are correct

## Security Notes

- Never commit private keys to version control
- Use SSH keys instead of passwords
- Regularly rotate SSH keys
- Use different keys for different environments