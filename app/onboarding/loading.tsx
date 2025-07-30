export default function Loading() {
  return (
    <div className="flex h-dvh w-screen items-center justify-center">
      <div className="animate-pulse">
        <div className="h-8 w-48 bg-muted rounded"></div>
      </div>
    </div>
  );
}