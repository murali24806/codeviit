import { RedirectToSignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function AuthPage() {
  const { userId } = await auth();
  
  if (userId) {
    redirect("/dashboard");
  }

  return <RedirectToSignIn fallbackRedirectUrl="/dashboard" signUpFallbackRedirectUrl="/dashboard" />;
}
