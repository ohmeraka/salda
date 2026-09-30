import { redirect } from "next/navigation";
import { ConfirmForm } from "@/components/auth/ConfirmForm";

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const params = await searchParams;
  if (!params.email) redirect("/welcome");

  return (
    <div style={{ padding: "28px 20px 36px" }}>
      <ConfirmForm email={params.email} />
    </div>
  );
}
