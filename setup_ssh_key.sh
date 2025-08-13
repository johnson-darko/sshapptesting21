#!/bin/bash

echo "Setting up your EC2 private key for SSH connections..."

# Create SSH directory if it doesn't exist
mkdir -p ~/.ssh

echo ""
echo "✅ SSH directory created at ~/.ssh"
echo ""
echo "📝 Next steps:"
echo "1. Copy your ec2key.pem file contents"
echo "2. Run: nano ~/.ssh/ec2key.pem" 
echo "3. Paste your private key contents and save (Ctrl+X, Y, Enter)"
echo "4. Run: chmod 600 ~/.ssh/ec2key.pem"
echo "5. Test manually: ssh -i ~/.ssh/ec2key.pem ubuntu@3.145.21.146"
echo ""
echo "ℹ️  Your app is now configured to use ~/.ssh/ec2key.pem for connections"
echo ""

# Check if file already exists
if [ -f ~/.ssh/ec2key.pem ]; then
    echo "✅ ec2key.pem already exists"
    echo "📄 File permissions: $(ls -la ~/.ssh/ec2key.pem)"
    echo ""
    echo "🔗 Testing connection to your server..."
    if ssh -i ~/.ssh/ec2key.pem -o ConnectTimeout=5 -o StrictHostKeyChecking=no ubuntu@3.145.21.146 echo "Connection successful!"; then
        echo "✅ SSH connection working!"
        echo "🚀 Your app should now be able to connect"
    else
        echo "❌ SSH connection failed"
        echo "💡 Check that:"
        echo "   - Your private key file is correct"
        echo "   - Your EC2 server is running"
        echo "   - Security groups allow SSH (port 22)"
    fi
else
    echo "⏳ ec2key.pem not found - please create it as shown above"
fi