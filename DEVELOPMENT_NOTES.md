# Development Notes

## In-Memory Storage Behavior

This application uses in-memory storage for development, which means:

⚠️ **Data gets cleared when the server restarts** - This is normal behavior
- SSH connections will be lost
- SSH keys will be lost  
- Command history will be cleared

### After Server Restart, You Need To:

1. **Re-add your SSH keys** in the SSH Keys tab
2. **Re-create your server connections** in the Connections tab
3. **Set up SSH agent** (only once per session):
   ```bash
   eval "$(ssh-agent -s)"
   ssh-add ~/.ssh/your_key_name
   ```

## Current Status

✅ **Working Features:**
- Frontend/backend communication
- WebSocket real-time streaming
- SSH key validation and storage
- SSH connection creation and testing
- API endpoints responding correctly

⚠️ **Requires Setup Each Session:**
- SSH agent configuration
- Re-adding SSH keys and connections after restart

## Next Steps for Production

To make data persistent across restarts, you would:
1. Enable PostgreSQL database (already configured)
2. Update storage.ts to use database instead of memory
3. Run database migrations

For now, in-memory storage is perfect for development and testing.