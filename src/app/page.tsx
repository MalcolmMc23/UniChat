import AuthCheck from "@/components/auth/AuthCheck";
import VideoChat from "@/components/VideoChat";

export default function Home() {
  return (
    <AuthCheck>
      <main className="flex min-h-screen flex-col items-center justify-between p-4 md:p-8 lg:p-12">
        <h1 className="text-4xl font-bold">Welcome to EduChat</h1>
        <p className="mt-4">You&apos;re logged in and ready to chat!</p>
        <div className="w-full max-w-6xl">
          <VideoChat />
        </div>
      </main>
    </AuthCheck>
  );
}
