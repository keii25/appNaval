import InactivityHandler from "@/components/InactivityHandler";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <InactivityHandler />
      {children}
    </>
  );
}
