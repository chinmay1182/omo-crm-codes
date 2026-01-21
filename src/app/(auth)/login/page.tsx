import LoginForm from '../login/form';
import LoginGuard from '@/app/components/Auth/LoginGuard';

export default function LoginPage() {
  return (
    <LoginGuard>
      <div>
        <LoginForm />
      </div>
    </LoginGuard>
  );
}
