import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PartyRoom } from "@/components/party/party-room";
import { getAuthSession } from "@/lib/auth/session";
import { createPrivateMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return createPrivateMetadata("Private party room");
}

export default async function PartyRoomPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = await params;
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return <PartyRoom roomCode={roomCode.toUpperCase()} currentUserId={session.user.id} />;
}
