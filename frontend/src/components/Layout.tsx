import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";

type Props = {
  children: React.ReactNode;
};

export function Layout({ children }: Props) {
  const { user, isAuthenticated, hasRole, logout, isLoading } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Brand */}
            <Link to="/home" className="flex items-center">
              <span className="text-xl font-bold text-gray-900">MyApp</span>
            </Link>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              <Link
                to="/home"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Home
              </Link>
              {isAuthenticated && (
                <>
                  <Link
                    to="/inbox"
                    className="text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Inbox
                  </Link>
                  <Link
                    to="/dashboard"
                    className="text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Dashboard
                  </Link>
                  {hasRole("admin") && (
                    <Link
                      to="/admin"
                      className="text-purple-600 hover:text-purple-700 font-medium transition-colors"
                    >
                      Admin
                    </Link>
                  )}
                </>
              )}
            </div>

            {/* Auth Section */}
            <div className="flex items-center space-x-4">
              {isLoading ? (
                <div
                  className="w-24 h-8 rounded-md bg-gray-200 animate-pulse"
                  aria-hidden="true"
                />
              ) : isAuthenticated ? (
                <>
                  <div className="hidden sm:flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
                        {user?.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-medium text-gray-700 max-w-[150px] truncate">
                          {user?.email}
                        </span>
                        {user?.role && (
                          <span className="text-xs text-gray-500 capitalize">
                            {user.role}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => logout()}
                    className="text-sm"
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="outline" className="text-sm">
                      Log In
                    </Button>
                  </Link>
                  <Link to="/signup">
                    <Button className="text-sm">Sign Up</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            © 2025 MyApp. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
