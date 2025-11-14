import { GalleryVerticalEnd } from "lucide-react"
import Footer from "~/components/layout/footer"

import { SignupPage as SignupForm } from "~/components/signup-form"

export default function SignupPage() {
  return (
    <div className="relative min-h-screen flex flex-col">
          {/* Header/Logo - Positioned absolutely over the SignInPage */}
          <div className="absolute top-0 left-0 right-0 z-10 p-6 md:p-10">
            <div className="flex justify-center gap-2 md:justify-start">
              <a 
                href="https://k-portfolio-liard.vercel.app" 
                className="flex text-black items-center gap-2 font-medium backdrop-blur-sm  px-4 py-2 rounded-lg hover:bg-black/30 transition-colors"
              >
                <div className="text-primary-foreground flex size-6 items-center justify-center rounded-md">
                  <GalleryVerticalEnd className="size-4 text-black" />
                </div>
                SKY Inc.
              </a>
            </div>
          </div>
    
          {/* Main Sign-In Content */}
          <div className="flex-1">
            <SignupForm
              title={
                <span className="font-light text-foreground tracking-tighter">
                  Start Your Journey
                </span>
              }
              description="Access your SKY Inc.Create account and continue your journey"
              heroImageSrc="https://images.unsplash.com/photo-1642615835477-d303d7dc9ee9?w=2160&q=80"
              
            />
          </div>
    
        
        </div>
  )
}
