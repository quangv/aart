import AuthToolbar from "@/app/_components/auth-toolbar";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <AuthToolbar requireUser />
      {children}
    </>
  );
}
