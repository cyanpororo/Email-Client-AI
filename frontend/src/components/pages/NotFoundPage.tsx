import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-6xl font-bold text-gray-800">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700">Page Not Found</h2>
        <p className="text-gray-600 max-w-md">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-4 justify-center mt-8">
          <Button onClick={() => navigate("/inbox")} className="px-6 py-2">
            Go to Inbox
          </Button>
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="px-6 py-2"
          >
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
