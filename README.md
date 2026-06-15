# ATS - Attendance Tracking System

A comprehensive Next.js-based employee attendance and task management system with role-based dashboards for admins and employees.

## 🎯 Features

### 👨‍💼 Admin Dashboard
- **Employee Management**: Add, edit, delete, and view employee profiles
- **Task Oversight**: Create, assign, edit, and track tasks across the organization
- **Attendance Tracking**: View real-time attendance records with work mode filters (Office/WFH)
- **Analytics**: Dashboard with attendance charts, employee stats, and pending task counts
- **Leave Management**: Approve or reject employee leave requests

### 👤 Employee Dashboard
- **Task Management**: View assigned tasks, submit reports, and track completion status
- **Attendance Control**: Clock in/out with work mode selection (Office/WFH)
- **Task Creation**: Create and assign tasks to other employees
- **Leave Requests**: Submit absence requests with date ranges and reasons
- **Profile**: View personal information and monthly statistics
- **Task Review**: Review and provide feedback on tasks created by you

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) with React 19
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with dark mode support
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) (Radix UI primitives)
- **Form Management**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Charts**: [Recharts](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Backend**: [Google Apps Script](https://script.google.com/)
- **State Management**: React Context API
- **Authentication**: Session-based (localStorage)

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- Node.js 18+ and npm/yarn
- Git

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/ats.git
cd ats
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env.local` and update the Google Apps Script URL:
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) in your browser.

### 5. Build for Production
```bash
npm run build
npm start
```

## 📁 Project Structure

```
src/
├── app/                    # Next.js app directory with routes
│   ├── admin/             # Admin dashboard routes
│   ├── employee/          # Employee dashboard routes
│   ├── layout.tsx         # Root layout with auth provider
│   ├── page.tsx           # Login page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── admin/            # Admin-specific components
│   ├── auth/             # Authentication components
│   ├── dashboard/        # Shared dashboard components
│   ├── employee/         # Employee-specific components
│   └── ui/               # Reusable shadcn/ui components
├── contexts/             # React Context providers
│   └── auth-context.tsx  # Authentication context
├── hooks/                # Custom React hooks
│   ├── use-auth.ts
│   ├── use-mobile.tsx
│   └── use-toast.ts
└── lib/                  # Utilities and helpers
    ├── api.ts            # Google Apps Script API client
    ├── types.ts          # TypeScript interfaces
    └── utils.ts          # Utility functions
```

## 🔐 Authentication

The app uses role-based authentication with two roles:
- **ADMIN**: Full access to employee management, task oversight, and analytics
- **EMPLOYEE**: Limited access to personal tasks, attendance, and profile

User sessions are stored in localStorage and persisted across browser sessions.

## 📡 API Integration

All API calls are made to a Google Apps Script backend via the `apiCall()` function in `src/lib/api.ts`.

### Available API Actions:
- **Users**: `LOGIN`, `GET_USERS`, `ADD_USER`, `UPDATE_USER`, `DELETE_USER`
- **Tasks**: `GET_TASKS`, `ADD_TASK`, `UPDATE_TASK`, `DELETE_TASK`
- **Attendance**: `GET_ATTENDANCE`, `CLOCK_IN`, `CLOCK_OUT`
- **Leaves**: `SUBMIT_LEAVE`, `GET_LEAVES`
- **Analytics**: `GET_ATTENDANCE_SUMMARY`, `GET_HOURS_SUMMARY`

## 🎨 Customization

### Colors & Theming
Edit `tailwind.config.ts` to customize colors and add custom themes.

### Components
All UI components are from shadcn/ui and can be customized in `src/components/ui/`.

## 📦 Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Type-check with TypeScript

## 🚢 Deployment

### Deploy to Vercel (Recommended)
1. Push your code to GitHub
2. Sign up at [vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variable: `NEXT_PUBLIC_API_URL`
5. Deploy!

### Deploy to Other Platforms
Next.js can be deployed to any platform supporting Node.js (AWS, Azure, DigitalOcean, etc.).

## 📝 Environment Variables

- `NEXT_PUBLIC_API_URL` - Google Apps Script web app URL (required)

## 🐛 Troubleshooting

### Build Errors
- Run `npm install` to ensure all dependencies are installed
- Clear `.next` folder: `rm -rf .next`
- Run `npm run typecheck` to check for TypeScript errors

### API Connection Issues
- Verify the Google Apps Script URL in `.env.local`
- Check browser console for detailed error logs
- Ensure Google Apps Script is deployed as a web app

### CORS Issues
The API client uses `Content-Type: text/plain` to avoid CORS preflight requests with Google Apps Script.

## 👥 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For issues or questions, please open an issue on GitHub or contact the development team.

---

**Built with ❤️ using Next.js, React, and shadcn/ui**
