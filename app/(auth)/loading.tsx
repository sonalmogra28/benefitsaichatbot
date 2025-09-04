export default function AuthLoading() {
  return (
    <div className="flex h-dvh w-screen items-center justify-center bg-background">
      <div className="animate-pulse">
        <div className="h-4 w-32 bg-gray-200 rounded dark:bg-gray-700" />
      </div>
    </div>
  );
}
