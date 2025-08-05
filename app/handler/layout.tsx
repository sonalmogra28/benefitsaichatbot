export default function HandlerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      <div className="w-full max-w-md px-4">
        {children}
      </div>
    </div>
  );
}