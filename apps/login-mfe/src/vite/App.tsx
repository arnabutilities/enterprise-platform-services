import type { LoginRemoteProps } from '@enterprise-platform/contracts';
import { Login } from '@/components/Login';

export default function App(props: LoginRemoteProps) {
  return <Login {...props} />;
}
