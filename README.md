# HEUNETS Backend API

A robust Express.js REST API for work item management with JWT authentication and MongoDB.

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- MongoDB 4.4+
- Git

### Installation
```bash
# 1. Clone repository
git clone git@github.com:KevinEjiofor/HEUNETS_backend.git
cd HEUNETS_backend

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
# Edit .env with your configurations

# 4. Start development server
npm run dev
```

Server runs on `http://localhost:5000`

## ⚙️ Environment Setup

Create `.env` file:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/heunets
JWT_SECRET=your_super_secure_jwt_secret_here
JWT_EXPIRES_IN=3h
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
CLIENT_URL=http://localhost:3000
```

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 📚 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/admin/register` | Register new admin |
| POST | `/api/auth/admin/login` | Login admin |
| POST | `/api/auth/verify-email` | Verify email with PIN |

### Work Items
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workitems` | Get all work items |
| POST | `/api/workitems` | Create work item |
| PUT | `/api/workitems/bulk` | Bulk update items |
| GET | `/api/workitems/stats` | Get statistics |
| GET | `/api/workitems/assignees/list` | Get assignee list |

## 🔧 Key Features

- **JWT Authentication** - Secure token-based auth
- **Role-based Access** - Admin/Super Admin roles
- **Work Item Management** - Full CRUD operations
- **Bulk Operations** - Update multiple items
- **Advanced Filtering** - Filter by status, priority, assignee
- **Email Notifications** - Verification & alerts
- **Statistics** - Comprehensive analytics

## 🗂️ Project Structure
```
src/
├── admin/           # Authentication & admin management
├── workItem/        # Work item operations  
├── middleware/      # Auth & validation
├── utils/           # Helpers & utilities
└── config/          # Configuration
```

## 🧪 Testing with Postman

### 1. Get Authentication Token
```bash
# Register
POST /api/auth/admin/register
{
  "firstName": "John",
  "lastName": "Doe", 
  "email": "admin@example.com",
  "password": "SecurePass123!"
}

# Login to get token
POST /api/auth/admin/login
{
  "email": "admin@example.com",
  "password": "SecurePass123!"
}
```

### 2. Use Token in Headers
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

### 3. Test Work Item Operations
```bash
# Create work item
POST /api/workitems
{
  "title": "Fix Bug",
  "description": "Important bug fix",
  "status": "pending",
  "priority": "high"
}

# Bulk update
PUT /api/workitems/bulk  
{
  "ids": ["id1", "id2"],
  "updateData": {
    "status": "completed"
  }
}
```

## 🚀 Deployment

### Production Setup
```bash
# Set production environment
NODE_ENV=production

# Use production MongoDB
MONGODB_URI=mongodb://your-production-db

# Start production server
npm start
```

### Using PM2 (Recommended)
```bash
npm install -g pm2
pm2 start src/serve.js --name "heunets-api"
pm2 startup
pm2 save
```

## 🐛 Troubleshooting

### Common Issues
1. **MongoDB Connection Failed**
    - Ensure MongoDB is running: `sudo systemctl start mongod`
    - Check connection string in `.env`

2. **JWT Errors**
    - Verify `JWT_SECRET` is set in `.env`
    - Check token expiration

3. **Port Already in Use**
   ```bash
   lsof -ti:5000 | xargs kill -9
   ```

4. **Email Not Sending**
    - Verify email credentials
    - Use app passwords for Gmail

### Logs & Debugging
```bash
# View logs
tail -f logs/app.log

# Debug mode
DEBUG=* npm run dev
```

## 📞 Support

For issues:
1. Check troubleshooting section
2. Verify environment variables
3. Check application logs
4. Ensure MongoDB is accessible

---

**Ready to build!** 🎉 Start with `npm run dev` and test endpoints using Postman.