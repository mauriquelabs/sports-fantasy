import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mail, ArrowLeft } from "lucide-react";

export default function VerifyEmail() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Mail className="w-8 h-8 text-primary" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Check your email
        </h1>
        
        <p className="text-gray-600 mb-6">
          We've sent you a verification link. Please check your inbox and click the link to activate your account.
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-500">
            Didn't receive the email? Check your spam folder or try signing up again.
          </p>
        </div>

        <Link to="/login">
          <Button variant="outline" className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Login
          </Button>
        </Link>
      </div>
    </div>
  );
}
