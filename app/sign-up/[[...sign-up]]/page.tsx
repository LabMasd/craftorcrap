import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-[#0a0a0a] border border-white/10",
            headerTitle: "text-white",
            headerSubtitle: "text-white/50",
            socialButtonsBlockButton: "bg-white text-black hover:bg-white/90",
            socialButtonsBlockButtonText: "font-medium",
            dividerLine: "bg-white/10",
            dividerText: "text-white/30",
            formFieldLabel: "text-white/70",
            formFieldInput: "bg-white/5 border-white/10 text-white",
            footerActionLink: "text-white hover:text-white/80",
          },
        }}
      />
    </div>
  );
}
