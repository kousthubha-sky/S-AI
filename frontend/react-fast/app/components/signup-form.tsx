import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "~/components/ui/field"
import { Input } from "~/components/ui/input"
import { Link, Navigate } from "react-router"
import { useAuth0 } from "@auth0/auth0-react"

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { loginWithRedirect, isAuthenticated } = useAuth0();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }
  const handleSignup = async () => {
    try {
      await loginWithRedirect({
        authorizationParams: {
          redirect_uri: `${window.location.origin}/callback`,
          screen_hint: 'signup'
        },
        appState: {
          returnTo: '/dashboard',
          type: 'signup'
        }
      });
    } catch (error) {
      console.error('Signup error:', error);
    }
  };

const handleGoogleSignup = async () => {
  try {
    await loginWithRedirect({
      authorizationParams: {
        connection: 'google-oauth2',
        redirect_uri: `${window.location.origin}/callback`,
        screen_hint: 'signup'
      },
      appState: {
        returnTo: '/dashboard',
        type: 'signup',
        provider: 'google'
      }
    });
  } catch (error) {
    console.error('Google signup error:', error);
  }
};
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Choose your preferred signup method
          </p>
        </div>
        <Field>
          <Button 
            onClick={() => handleSignup()} 
            className="w-full"
          >
            Sign up with Credentials
          </Button>
        </Field>
        <FieldSeparator>Or</FieldSeparator>
        <Field>
          <Button
            variant="outline"
            type="button"
            className="flex w-full items-center gap-2 border-gray-300 hover:bg-gray-100 text-gray-700"
            onClick={() => handleGoogleSignup()}
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
          <FieldDescription className="px-6 text-center">
            Already have an account? 
            <Link to="/login" className="underline underline-offset-4">
              Log in
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </div>
  )
}
