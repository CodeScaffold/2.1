# Deployment Guide for Tools App

This guide explains how to deploy your React/Vite frontend and Koa.js backend to server **20.93.7.130** using the provided CI/CD pipeline and nginx configuration.

## Prerequisites on Server (20.93.7.130)

### 1. Install Required Software
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install nginx
sudo apt install nginx -y

# Install PM2 (Process Manager for Node.js)
sudo npm install -g pm2

# Install Git
sudo apt install git -y

# Install PostgreSQL (if using PostgreSQL for Prisma)
sudo apt install postgresql postgresql-contrib -y
```

### 2. Create Application Directories
```bash
# Create directories
sudo mkdir -p /var/www/tools-app
sudo mkdir -p /var/www/html
sudo chown $USER:$USER /var/www/tools-app
sudo chown $USER:$USER /var/www/html
```

### 3. Setup Database (if using PostgreSQL)
```bash
# Switch to postgres user and create database
sudo -u postgres psql
CREATE DATABASE tools_app;
CREATE USER tools_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE tools_app TO tools_user;
\q
```

## GitHub Setup

### 1. Add Repository Secrets
Go to your GitHub repository settings → Secrets and variables → Actions, then add:

- `SERVER_USERNAME`: Your server username (e.g., `ubuntu`, `root`, or your custom user)
- `SERVER_SSH_KEY`: Your private SSH key for server access

### 2. Generate SSH Key (if needed)
On your local machine:
```bash
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"
cat ~/.ssh/id_rsa.pub  # Copy this to server's ~/.ssh/authorized_keys
cat ~/.ssh/id_rsa      # Copy this to GitHub secrets as SERVER_SSH_KEY
```

On the server:
```bash
mkdir -p ~/.ssh
echo "your_public_key_here" >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

## Nginx Configuration

### 1. Install the Configuration
```bash
# Copy the nginx.conf file to nginx sites-available
sudo cp nginx.conf /etc/nginx/sites-available/tools-app

# Create symbolic link to enable the site
sudo ln -s /etc/nginx/sites-available/tools-app /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 2. Adjust Backend Port (if needed)
If your backend runs on a different port than 3000, edit the nginx config:
```bash
sudo nano /etc/nginx/sites-available/tools-app
# Change: proxy_pass http://localhost:3000;
# To your actual port
```

## Environment Variables

### 1. Backend Environment Variables
Create `/var/www/tools-app/backend/.env`:
```bash
# Database
DATABASE_URL="postgresql://tools_user:your_secure_password@localhost:5432/tools_app"

# Server
PORT=3000
NODE_ENV=production

# JWT Secret (generate a secure random string)
JWT_SECRET="your-super-secure-jwt-secret-key"

# Other app-specific variables
# Add your application's environment variables here
```

### 2. Frontend Environment Variables (if needed)
If your frontend needs environment variables, they should be built into the app during CI/CD.
Update your `Front/.env` file in the repository:
```bash
VITE_API_URL=http://20.93.7.130/api
VITE_APP_ENV=production
```

## Manual Deployment (Alternative)

If you prefer manual deployment instead of CI/CD:

### 1. Clone Repository
```bash
cd /var/www/tools-app
git clone https://github.com/your-username/your-repo.git .
```

### 2. Build and Deploy Frontend
```bash
cd Front
npm install
npm run build
sudo cp -r dist/* /var/www/html/
```

### 3. Build and Deploy Backend
```bash
cd ../back
npm install
npx prisma generate
npx prisma migrate deploy  # Run database migrations
npm run build

# Start with PM2
pm2 start dist/app.js --name tools-backend
pm2 save  # Save PM2 configuration
pm2 startup  # Setup PM2 to start on boot
```

## Firewall Configuration

```bash
# Allow HTTP and HTTPS traffic
sudo ufw allow 'Nginx Full'
sudo ufw allow ssh
sudo ufw enable
```

## SSL Certificate (Optional but Recommended)

### Using Let's Encrypt:
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com

# Auto-renewal is set up automatically
```

## Monitoring and Maintenance

### 1. PM2 Commands
```bash
pm2 status                    # Check status
pm2 logs tools-backend        # View logs
pm2 restart tools-backend     # Restart app
pm2 stop tools-backend        # Stop app
pm2 delete tools-backend      # Remove app
```

### 2. Nginx Commands
```bash
sudo systemctl status nginx   # Check status
sudo systemctl restart nginx  # Restart
sudo nginx -t                 # Test configuration
sudo tail -f /var/log/nginx/tools-app-access.log  # View access logs
sudo tail -f /var/log/nginx/tools-app-error.log   # View error logs
```

### 3. Database Maintenance
```bash
# Backup database
pg_dump -U tools_user -h localhost tools_app > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore database
psql -U tools_user -h localhost tools_app < backup_file.sql
```

## Troubleshooting

### Common Issues:

1. **CI/CD fails to connect**: Check SSH key configuration and server firewall
2. **Backend not starting**: Check environment variables and database connection
3. **404 errors on API**: Verify nginx proxy configuration and backend port
4. **Frontend not loading**: Check if files are in /var/www/html and nginx config
5. **Database connection errors**: Verify DATABASE_URL and database credentials

### Log Locations:
- Nginx access logs: `/var/log/nginx/tools-app-access.log`
- Nginx error logs: `/var/log/nginx/tools-app-error.log`
- PM2 logs: `pm2 logs tools-backend`
- System logs: `journalctl -u nginx`

## Security Recommendations

1. Keep system updated: `sudo apt update && sudo apt upgrade`
2. Use strong passwords for database
3. Enable firewall with minimal required ports
4. Set up SSL certificate
5. Regularly backup your database
6. Monitor logs for suspicious activity
7. Keep Node.js and npm updated
8. Use environment variables for sensitive data

## Performance Optimization

1. Enable gzip compression (included in nginx config)
2. Set up proper caching headers (included in nginx config)
3. Monitor PM2 processes with `pm2 monit`
4. Consider using a CDN for static assets
5. Optimize your database queries and indexes

Your application should now be accessible at `http://20.93.7.130`