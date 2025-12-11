import { SignupForm } from "@/components/auth/signup-form"
import { Logo } from "@/components/logo"

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center space-y-2">
          <Logo size="lg" />
          <h1 className="text-2xl font-semibold">Join Nexus</h1>
          <p className="text-muted-foreground text-center">Create your account and start connecting</p>
        </div>
        <SignupForm />
      </div>
    </div>
  )
}
