import { connection } from "next/server";
import { BoardClient } from "./board-client";

export default async function Home({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const inviteParam = resolvedSearchParams?.invite;
  const inviteToken = Array.isArray(inviteParam) ? inviteParam[0] : inviteParam;
  const resetParam = resolvedSearchParams?.reset;
  const resetToken = Array.isArray(resetParam) ? resetParam[0] : resetParam;

  return (
    <main>
      <BoardClient
        apiUrl={apiUrl}
        initialInviteToken={inviteToken}
        initialResetToken={resetToken}
      />
    </main>
  );
}
