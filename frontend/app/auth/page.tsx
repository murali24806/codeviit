"use client"

import { RedirectToSignIn, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) return null;
  if (isSignedIn) return null;

  return <RedirectToSignIn fallbackRedirectUrl="/dashboard" signUpFallbackRedirectUrl="/dashboard" />;
}
