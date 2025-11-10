import { GalleryVerticalEnd } from "lucide-react"

import { LoginForm } from "~/components/login-form"
import Footer from "~/components/layout/footer"

export default function LoginPage() {
  return (
    <div className="grid min-h-svh">
      
      <div className="flex flex-col gap-4 p-6 md:p-10 ">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="https://k-portfolio-liard.vercel.app" className="flex text-white items-center gap-2 font-medium">
            <div className=" text-primary-foreground flex size-6 items-center justify-center rounded-md">
              <GalleryVerticalEnd className="size-4" />
            </div>
            SKY Inc.
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
    <Footer/>  
    </div>
  )
}
