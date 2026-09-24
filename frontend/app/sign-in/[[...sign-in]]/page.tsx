import { SignIn } from "@clerk/nextjs";
import { Code2 } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-black text-white relative overflow-hidden">
      
      {/* Subtle iPhone-like dark mode ambient lighting (very faint) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[30%] bg-white/[0.02] blur-[100px] rounded-[100%]" />

      <div className="flex flex-col items-center mb-10 relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-white/[0.08] p-2 rounded-2xl border border-white/[0.1] shadow-lg backdrop-blur-xl">
            <Code2 size={28} className="text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight">code.viit</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">Welcome back</h1>
        <p className="text-zinc-500 font-medium text-lg">Your thinking partner for big ambitions</p>
      </div>

      <div className="w-full max-w-[420px] relative z-10 px-4">
        
        <SignIn 
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "bg-[#111111]/70 backdrop-blur-[40px] border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] rounded-[32px] p-6 w-full relative overflow-hidden",
              headerTitle: "hidden", 
              headerSubtitle: "hidden",
              dividerRow: "my-6",
              dividerLine: "bg-transparent",
              dividerText: "text-zinc-500 font-medium text-xs uppercase tracking-widest bg-transparent",
              formFieldLabel: "text-zinc-400 text-sm font-medium ml-1 mb-2",
              formFieldInput: "bg-black/50 border border-white/[0.1] text-white placeholder:text-zinc-600 rounded-2xl px-5 py-4 h-14 focus:border-white/[0.2] focus:ring-0 transition-all",
              formButtonPrimary: "bg-white hover:bg-zinc-200 text-black font-semibold rounded-2xl py-4 h-14 mt-4 transition-all text-base active:scale-[0.98]",
              socialButtonsBlockButton: "bg-white/[0.04] border border-transparent hover:bg-white/[0.08] text-white rounded-2xl py-4 h-14 mb-3 transition-all justify-center",
              socialButtonsBlockButtonText: "text-white font-medium text-sm ml-1",
              socialButtonsProviderIcon: "mr-2 scale-110 opacity-90",
              footerActionText: "text-zinc-500",
              footerActionLink: "text-white hover:text-zinc-300 font-medium",
              identityPreview: "bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4",
              identityPreviewText: "text-white font-medium",
              identityPreviewEditButton: "text-zinc-400 hover:text-white transition-colors",
              formFieldInputShowPasswordButton: "text-zinc-400 hover:text-white transition-colors"
            }
          }}
        />
      </div>
    </div>
  );
}
