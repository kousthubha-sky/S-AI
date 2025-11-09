import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldSeparator,
} from "~/components/ui/field"
import { Link, Navigate } from "react-router"
import { useAuth0 } from "@auth0/auth0-react"
import { motion } from "framer-motion"
import Orb from "./ui/background-orb"

export function SignupForm({ className, ...props }: React.ComponentProps<"div">) {
  const { loginWithRedirect, isAuthenticated } = useAuth0();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }

  const handleSignup = async () => {
    try {
      await loginWithRedirect({
        authorizationParams: {
          redirect_uri: `${window.location.origin}/callback`,
          screen_hint: "signup",
          connection: "Username-Password-Authentication",
        },
        appState: { returnTo: "/dashboard", type: "signup" },
      });
    } catch (error) {
      console.error("Signup error:", error);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      await loginWithRedirect({
        authorizationParams: {
          connection: "google-oauth2",
          redirect_uri: `${window.location.origin}/callback`,
          screen_hint: "signup",
        },
        appState: { returnTo: "/dashboard", type: "signup", provider: "google" },
      });
    } catch (error) {
      console.error("Google signup error:", error);
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className={cn("flex flex-col gap-6 relative", className)} {...props}>
      <div className="absolute inset-0 -z-10 opacity-40">
        <Orb />
      </div>

      <FieldGroup>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center gap-1 text-center"
        >
          <h1 className="text-3xl font-bold text-white tracking-wide">
            Create Your Account
          </h1>
          <p className="text-sm text-gray-300">
            Choose your preferred signup method
          </p>
        </motion.div>

        <Field>
          <Button
            onClick={handleSignup}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium rounded-xl shadow-lg shadow-purple-500/30 hover:scale-[1.02] transition-all duration-300"
          >
            Sign up with Credentials
          </Button>
        </Field>

        <FieldSeparator>Or</FieldSeparator>

        <Field>
          <Button
            variant="outline"
            type="button"
            onClick={handleGoogleSignup}
            className="flex w-full items-center justify-center gap-2 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20 transition-all duration-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 48 48"
              className="w-5 h-5"
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.04 1.54 7.42 2.83l5.48-5.48C33.43 3.64 28.97 2 24 2 14.82 2 7.14 7.68 3.97 15.17l6.89 5.35C12.2 14.16 17.59 9.5 24 9.5z"
              />
              <path
                fill="#34A853"
                d="M46.15 24.5c0-1.47-.13-2.88-.36-4.25H24v8.06h12.44c-.54 2.78-2.16 5.12-4.56 6.69l7.1 5.51c4.15-3.83 6.57-9.48 6.57-15.01z"
              />
              <path
                fill="#FBBC05"
                d="M10.86 28.47A14.49 14.49 0 0 1 9.5 24c0-1.55.27-3.04.75-4.47l-6.89-5.35A22.03 22.03 0 0 0 2 24c0 3.6.86 7 2.36 10l6.5-5.53z"
              />
              <path
                fill="#4285F4"
                d="M24 46c5.94 0 10.92-1.97 14.56-5.36l-7.1-5.51c-1.98 1.34-4.54 2.13-7.46 2.13-6.41 0-11.8-4.66-13.64-10.93l-6.5 5.53C7.14 40.32 14.82 46 24 46z"
              />
            </svg>
            Sign up with Google
          </Button>

          <FieldDescription className="text-center text-sm text-gray-300 mt-2">
            Already have an account?{" "}
            <Link to="/login" className="text-purple-400 hover:text-pink-400 underline underline-offset-4 transition-colors">
              Log in
            </Link>
            <motion.div
            variants={itemVariants}
            className="flex items-center justify-center gap-2 text-xs text-gray-400 mt-4"
          >
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Secured by Auth0</span>
          </motion.div>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </div>
  );
}
