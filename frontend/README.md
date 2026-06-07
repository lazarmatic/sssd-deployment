# Security System - Frontend

A secure user and admin dashboard frontend for the SSSD (Secure System Security Dashboard) project.

## Features

### User Dashboard
- ✅ Personalized greeting with user information
- ✅ Security settings management
- ✅ 2FA settings (SMS and TOTP)
- ✅ Password change functionality
- ✅ Active sessions management
- ✅ Trusted devices management
- ✅ Logout functionality

### Admin Dashboard
- ✅ Admin dashboard with statistics
- ✅ User management with block/unblock capabilities
- ✅ Comprehensive audit logs with filtering and pagination
- ✅ Reserved usernames CRUD operations
- ✅ Advanced filtering options for audit logs

## Prerequisites

- Node.js 18+ and npm/yarn
- Backend API running at `http://localhost:3000/api`

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables (already set in `.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## Running the Frontend

### Development Mode
```bash
npm run dev
```

The frontend will be available at:
- `http://localhost:3000/front` (with basePath configured)

### Production Build
```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── pages/              # Next.js pages and routes
│   ├── index.tsx       # Home page (redirects to login/dashboard)
│   ├── login.tsx       # Login page with 2FA
│   ├── dashboard.tsx   # User dashboard
│   ├── 2fa.tsx         # 2FA settings
│   ├── change-password.tsx # Password change
│   └── admin/
│       ├── index.tsx   # Admin dashboard
│       ├── audit-logs.tsx # Audit logs view
│       ├── users.tsx   # User management
│       └── reserved-usernames.tsx # Reserved usernames management
├── components/         # React components
│   └── common.tsx      # Common components (Header, Sidebar, etc.)
├── context/            # React Context
│   └── AuthContext.tsx # Authentication context
├── services/           # API services
│   └── api.ts          # API client service
├── types/              # TypeScript types
│   └── index.ts        # Type definitions
├── styles/             # CSS styles
│   └── globals.css     # Global styles
├── public/             # Static files
├── package.json        # Dependencies
├── tsconfig.json       # TypeScript config
├── next.config.js      # Next.js config
└── .env.local          # Environment variables

```

## Key Technologies

- **Next.js 14** - React framework with built-in routing
- **TypeScript** - Type-safe development
- **Axios** - HTTP client for API calls
- **React Context** - State management for authentication
- **CSS** - Inline and global styles

## Authentication Flow

1. **Login Page** (`/login`)
   - User enters username/email and password
   - 2FA code is sent via SMS (or use hardcoded code "123456" for testing)
   - User enters 2FA code to complete login

2. **Protected Routes**
   - `ProtectedRoute` component checks authentication
   - Unauthenticated users are redirected to `/login`
   - Admin routes check for `user.role === 'admin'`

3. **Token Management**
   - Access token stored in localStorage
   - Refresh token used for token refresh
   - Automatic token refresh on 401 response

## API Endpoints Used

### Authentication
- `POST /auth/login` - Login with credentials
- `POST /auth/2fa` - Verify 2FA code
- `POST /auth/2fa/resend` - Resend 2FA code
- `GET /auth/me` - Get current user info
- `POST /auth/password-change` - Change password
- `POST /auth/totp/setup` - Setup TOTP
- `POST /auth/totp/verify` - Verify TOTP

### Session Management
- `POST /session/logout` - Logout specific session
- `POST /session/logout-all` - Logout all sessions
- `GET /session/active` - Get active sessions

### Admin Functions
- `GET /admin/audit-logs` - Get audit logs with filtering
- `GET /admin/audit-logs/stats` - Get audit statistics
- `GET /admin/users` - List all users
- `PATCH /admin/users/:userId/block` - Block user
- `PATCH /admin/users/:userId/unblock` - Unblock user
- `GET /admin/reserved-usernames` - List reserved usernames
- `POST /admin/reserved-usernames` - Add reserved username
- `PUT /admin/reserved-usernames/:username` - Update reserved username
- `DELETE /admin/reserved-usernames/:username` - Delete reserved username

## Testing

### Test User Credentials
- **Username:** testuser
- **Password:** Test@123456
- **2FA Code:** 123456 (hardcoded for development)

### Admin User
- **Username:** admin
- **Password:** Admin@123456
- **2FA Code:** 123456

## Security Features

1. **JWT Authentication** - Secure token-based authentication
2. **2FA Protection** - SMS and TOTP-based 2FA
3. **Password Validation** - Strong password requirements
4. **Session Management** - Multiple session support
5. **Audit Logging** - Comprehensive audit trail
6. **Role-Based Access Control** - Admin vs user roles
7. **Account Blocking** - Admin can block malicious users
8. **Reserved Usernames** - Prevent registration of system usernames

## Development Tips

### Adding a New Page
1. Create file in `pages/` directory (e.g., `pages/my-page.tsx`)
2. Use `ProtectedRoute` or `AdminRoute` wrapper
3. Use `useAuth` hook to access user data
4. Import `apiService` for API calls

### Adding a New API Endpoint
1. Add method to `services/api.ts`
2. Define types in `types/index.ts` if needed
3. Use in components/pages

### Styling
- Global styles in `styles/globals.css`
- Inline styles for component-specific styling
- CSS classes: `.btn`, `.card`, `.alert`, `.form-group`, etc.

## Troubleshooting

### "Cannot find module" errors
```bash
npm install
```

### API connection errors
- Ensure backend is running at `http://localhost:3000/api`
- Check `NEXT_PUBLIC_API_URL` in `.env.local`

### 2FA not working
- For development, use the hardcoded code: `123456`
- Check phone number format in registration

### Styling issues
- Clear Next.js cache: `rm -rf .next`
- Rebuild: `npm run build`

## Best Practices

1. Always use `ProtectedRoute` wrapper for authenticated pages
2. Use `useAuth()` hook for accessing user data
3. Use `apiService` for all API calls
4. Add error handling for all async operations
5. Display user-friendly error messages
6. Use TypeScript for type safety
7. Follow the existing code structure

## License

ISC

## Support

For issues or questions, please contact the development team.
