import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <Card className="max-w-md w-full border-[#2d3344] bg-[#1d2332]">
        <CardContent className="pt-10 pb-8 text-center space-y-5">
          <div className="text-6xl font-bold text-orange-500">404</div>
          <p className="text-slate-400 text-sm">The page you're looking for doesn't exist</p>
          <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white border-0">
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />Back to Dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
