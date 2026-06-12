import { LoginForm } from '@/components/auth/login-form';
import { Logo } from '@/components/ui/logo';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="flex w-full max-w-sm flex-col items-center space-y-6">
        <Logo className="h-12 w-12" />
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Welcome to Tracker</h1>
          <p className="text-muted-foreground">
            Sign in to access your dashboard
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
