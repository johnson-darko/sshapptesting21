# Development Notes

## Database Storage

This application now uses **PostgreSQL database** for persistent storage:

✅ **Data persists across server restarts**
- SSH connections are saved
- SSH keys are saved  
- Command history is preserved

### Setup Required (One Time):

1. **Set up SSH agent** (once per development session):
   ```bash
   eval "$(ssh-agent -s)"
   ssh-add ~/.ssh/your_key_name
   ```

2. **Add your SSH keys** - they will be saved in the database
3. **Create server connections** - they will persist across restarts

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