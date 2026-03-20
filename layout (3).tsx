export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] via-[#1e3a5f] to-[#152a4a] flex items-center justify-center p-4">
      {children}
    </div>
  );
}
