import { RedirectToSignIn } from "@clerk/nextjs";

export default function AuthPage() {
  return <RedirectToSignIn fallbackRedirectUrl="/dashboard" signUpFallbackRedirectUrl="/dashboard" />;
}
