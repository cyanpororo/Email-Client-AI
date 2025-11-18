import { useForm } from "react-hook-form";
import { useAuth } from "../../contexts/AuthContext";
import { Link } from "react-router-dom";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Alert } from "../ui/alert";

type FormData = { email: string; password: string };

export default function Login() {
  const { login, googleLogin, error, isLoading } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: { email: "", password: "" },
    mode: "onBlur",
  });

  const onSubmit = async (values: FormData) => {
    await login(values.email, values.password);
  };

  const handleGoogleSuccess = async (
    credentialResponse: CredentialResponse
  ) => {
    if (credentialResponse.credential) {
      await googleLogin(credentialResponse.credential);
    }
  };

  const handleGoogleError = () => {
    console.error("Google Login Failed");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Log in to your account</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="space-y-4"
          >
            {error && <Alert variant="destructive">{error}</Alert>}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                aria-invalid={errors.email ? "true" : "false"}
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Please provide a valid email address",
                  },
                })}
              />
              {errors.email && (
                <p className="text-sm text-red-600" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                aria-invalid={errors.password ? "true" : "false"}
                {...register("password", {
                  required: "Password is required",
                  minLength: {
                    value: 6,
                    message: "Password must be at least 6 characters long",
                  },
                })}
              />
              {errors.password && (
                <p className="text-sm text-red-600" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "Signing in…" : "Log In"}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap
                theme="outline"
                size="large"
                text="signin_with"
                shape="rectangular"
                locale="en"
              />
            </div>

            <p className="text-center text-sm text-gray-600">
              Don&apos;t have an account?{" "}
              <Link
                to="/signup"
                className="font-medium underline underline-offset-4"
              >
                Sign up
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
