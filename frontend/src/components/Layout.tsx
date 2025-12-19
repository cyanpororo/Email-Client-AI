import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";

type Props = {
  children: React.ReactNode;
};

export function Layout({ children }: Props) {
  const { user, isAuthenticated, hasRole, logout, isLoading } = useAuth();

  // Admin: left sidebar layout (sticky)
  if (hasRole("admin")) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar - sticky to viewport */}
        <aside className="w-72 bg-white border-r border-gray-200 h-screen sticky top-0 z-40 flex flex-col">
          {/* Sticky header: "MyApp" stays at top */}
          <div className="px-6 py-5 border-b sticky top-0 z-50 bg-white">
            <Link to="/home" className="flex items-center gap-3">
              <span className="text-xl font-bold text-gray-900">MyApp</span>
            </Link>
          </div>

          {/* Scrollable nav in the middle */}
          <nav className="px-4 py-6 overflow-y-auto flex-1 space-y-1">
            <Link
              to="/inbox/kanban"
              className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100"
            >
              Inbox
            </Link>
            <Link
              to="/dashboard"
              className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100"
            >
              Dashboard
            </Link>
            <Link
              to="/admin"
              className="block px-3 py-2 rounded-md text-purple-700 hover:bg-purple-50 font-medium"
            >
              Admin
            </Link>
          </nav>

          {/* Sticky footer: always visible at bottom */}
          <div className="px-4 py-4 border-t bg-white sticky bottom-0 z-50">
            {isLoading ? (
              <div className="animate-pulse h-12 rounded bg-gray-100" />
            ) : isAuthenticated && user ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                    {user.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-800 truncate">
                      {user.email}
                    </span>
                    <span className="text-xs text-gray-500 capitalize">
                      {user.role}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <Button
                    variant="outline"
                    onClick={() => logout()}
                    className="text-sm"
                  >
                    Logout
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link to="/login">
                  <Button variant="outline" className="text-sm">
                    Log In
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button className="text-sm">Sign Up</Button>
                </Link>
              </div>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  // Default (non-admin): top nav layout (unchanged)
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
                    to="/inbox/kanban"
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
                      <span className="text-sm font-medium text-gray-700 max-w-[150px] truncate">
                        {user?.email}
                      </span>
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
    </div>
  );
}
