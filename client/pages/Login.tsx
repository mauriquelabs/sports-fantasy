import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function Login() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-black text-gray-900">
            YourLeague
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Log In</h1>
          <p className="text-gray-600 mt-2">Welcome back to your league</p>
        </div>

        <form className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter your password"
            />
          </div>

          <Button className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3">
            Log In
          </Button>
        </form>

        <div className="text-center mt-6">
          <p className="text-gray-600">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary font-medium hover:underline">
              Sign Up
            </Link>
          </p>
        </div>

        <div className="text-center mt-4">
          <Link to="/" className="text-gray-500 hover:text-gray-700 text-sm">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
