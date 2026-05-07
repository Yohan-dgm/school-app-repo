# API Diagnostic Guide

This guide provides comprehensive tools to diagnose and troubleshoot API connectivity issues with your Toyar School App backend server.

## Problem Context

The app is experiencing issues where the API endpoint `http://172.20.10.3:9999/api/student-management/student/get-student-list-data` returns HTML redirects instead of JSON responses.

## Diagnostic Tools

### 1. Node.js API Diagnostic Script (`api-diagnostic.js`)

A comprehensive JavaScript-based diagnostic tool that tests your API server connectivity and responses.

**How to run:**
```bash
# Using npm/yarn scripts (recommended)
yarn diagnose-api
# or
npm run diagnose-api

# Or directly
node api-diagnostic.js
```

**What it tests:**
- ✅ Port connectivity (checks if port 9999 is open)
- ✅ Basic HTTP response analysis
- ✅ Content-type detection (HTML vs JSON)
- ✅ Redirect detection and analysis
- ✅ GET/POST requests to the problematic endpoint
- ✅ Authorization header testing
- ✅ Common endpoint discovery

### 2. Network Diagnostic Script (`network-diagnostic.sh`)

A bash-based comprehensive network diagnostic tool using system utilities.

**How to run:**
```bash
# Using npm/yarn scripts
yarn diagnose-network
# or
npm run diagnose-network

# Or directly
./network-diagnostic.sh
```

**What it tests:**
- ✅ Ping connectivity
- ✅ Port scanning (nmap)
- ✅ DNS resolution
- ✅ HTTP response analysis
- ✅ Redirect detection
- ✅ Multiple endpoint testing
- ✅ Process detection

**Requirements:**
- `curl` (usually pre-installed)
- `nc` (netcat)
- `nmap` (optional, install with `brew install nmap`)
- `dig` (DNS tools)

## Current API Configuration

Based on your codebase analysis:

```javascript
// Current configuration in .env
EXPO_PUBLIC_BASE_URL_API_SERVER_1=http://172.20.10.3:9999

// Problematic endpoint
POST /api/student-management/student/get-student-list-data

// Expected request format
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_TOKEN"
}
```

## Common Issues and Solutions

### Issue 1: Server Returns HTML Instead of JSON

**Symptoms:**
- Response contains `<html>`, `<!DOCTYPE>`, or HTML tags
- Content-Type is `text/html` instead of `application/json`

**Possible Causes:**
1. **Web Server Redirect**: Apache/Nginx is running instead of your API
2. **Wrong Port**: API is not running on port 9999
3. **URL Rewrite**: Server configuration is redirecting API calls
4. **HTTPS Redirect**: Server forcing HTTPS when you're using HTTP

**Solutions:**
```bash
# Check what's running on port 9999
netstat -tulpn | grep :9999
lsof -i :9999

# Test if API is running locally on the server
ssh user@172.20.10.3
curl http://localhost:9999/api/health

# Check for web server redirects
curl -I http://172.20.10.3:9999
```

### Issue 2: Connection Refused/Timeout

**Symptoms:**
- Cannot connect to server
- Port appears closed

**Possible Causes:**
1. API server is not running
2. Firewall blocking port 9999
3. API running on different port
4. Wrong IP address

**Solutions:**
```bash
# On the API server, check if your API process is running
ps aux | grep node  # or your API process name
pm2 list           # if using PM2

# Check firewall
sudo ufw status    # Ubuntu
sudo firewall-cmd --list-all  # CentOS/RHEL

# Start your API service
systemctl start your-api-service
# or
pm2 start your-api-app
```

### Issue 3: Wrong HTTP Method

**Symptoms:**
- 405 Method Not Allowed
- Endpoint works with different HTTP method

**Solutions:**
- Verify if endpoint expects GET or POST
- Check API documentation for correct method
- Test both methods using the diagnostic tools

## Manual Testing Commands

### Basic Connectivity Test
```bash
curl -v http://172.20.10.3:9999
```

### Test Problematic Endpoint (GET)
```bash
curl -v http://172.20.10.3:9999/api/student-management/student/get-student-list-data
```

### Test Problematic Endpoint (POST)
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{}' \
  -v http://172.20.10.3:9999/api/student-management/student/get-student-list-data
```

### Test with Authorization
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{}' \
  -v http://172.20.10.3:9999/api/student-management/student/get-student-list-data
```

### Check Response Headers Only
```bash
curl -I http://172.20.10.3:9999
```

## Server-Side Debugging Commands

Run these commands on your API server (172.20.10.3):

### Check Running Processes
```bash
# Check if your API is running
ps aux | grep node
ps aux | grep api
pm2 list

# Check what's using port 9999
netstat -tulpn | grep :9999
lsof -i :9999
```

### Check API Logs
```bash
# Common log locations
tail -f /var/log/api.log
tail -f /var/log/nodejs.log
pm2 logs
journalctl -u your-api-service -f

# If using Docker
docker logs your-api-container -f
```

### Test Locally on Server
```bash
# Test from the server itself
curl http://localhost:9999/api/health
curl http://localhost:9999/api/student-management/student/get-student-list-data

# Check server configuration
nginx -t  # if using Nginx
apache2ctl configtest  # if using Apache
```

### Restart Services
```bash
# Restart your API service
systemctl restart your-api-service

# Or if using PM2
pm2 restart your-api-app

# Or if using Docker
docker restart your-api-container
```

## Interpreting Diagnostic Results

### ✅ Healthy API Response
```
✓ Port 9999 is open on 172.20.10.3
✓ Server responds with HTTP 200
✓ Server response appears to be non-HTML
✓ POST request completed with status 200
Content-Type: application/json
```

### ❌ Problematic Responses
```
✗ Server returns HTML instead of JSON
✗ Server redirects (HTTP 301/302)
✗ Cannot connect to 172.20.10.3:9999
✗ POST request failed: Connection refused
```

## Next Steps

1. **Run Diagnostics**: Start with `yarn diagnose-api` for quick results
2. **Analyze Output**: Look for red ✗ indicators and error messages
3. **Check Server**: Log into your API server and verify the service status
4. **Test Locally**: Run commands locally on the server to isolate issues
5. **Check Logs**: Review API server logs for error details
6. **Contact Backend Team**: Share diagnostic output with your backend developers

## Integration with Your App

The diagnostic tools use the same configuration as your React Native app:

- Base URL from `EXPO_PUBLIC_BASE_URL_API_SERVER_1`
- Same endpoints your app is trying to access
- Same request headers and methods

This ensures that the diagnostic results accurately reflect what your app experiences.

## Troubleshooting Tips

1. **Always run diagnostics first** before making configuration changes
2. **Save diagnostic output** to share with your team
3. **Test both HTTP and HTTPS** if you suspect protocol issues
4. **Verify IP address** - ensure 172.20.10.3 is the correct server
5. **Check network connectivity** - ensure your development machine can reach the server
6. **Time-based issues** - API might be temporarily down or restarting

---

**Need Help?**

If diagnostic tools show persistent issues:

1. Share the complete diagnostic output with your backend team
2. Include the current timestamp and your network configuration
3. Verify the API server status with your system administrator
4. Consider testing with a different endpoint to isolate the issue