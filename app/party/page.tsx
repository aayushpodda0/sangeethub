"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PartyLandingPage() {
  const router = useRouter();
  const [roomName, setRoomName] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/party", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: roomName }),
      });
      const body = (await res.json()) as { data?: { roomCode: string }; error?: { message: string } };
      if (!res.ok) throw new Error(body.error?.message ?? "Couldn't create the room.");
      return body.data!;
    },
    onSuccess: (data) => router.push(`/party/${data.roomCode}`),
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Party listening rooms</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!roomName.trim()) {
            toast.error("Give your room a name first.");
            return;
          }
          createMutation.mutate();
        }}
        className="mb-8 space-y-3 rounded-2xl border border-border bg-card p-4"
      >
        <h2 className="text-sm font-semibold">Start a new room</h2>
        <Input
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          placeholder="Room name"
          aria-label="Room name"
        />
        <Button type="submit" disabled={createMutation.isPending} className="w-full">
          {createMutation.isPending ? "Creating..." : "Create room"}
        </Button>
      </form>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!joinCode.trim()) {
            toast.error("Enter a room code first.");
            return;
          }
          router.push(`/party/${joinCode.trim().toUpperCase()}`);
        }}
        className="space-y-3 rounded-2xl border border-border bg-card p-4"
      >
        <h2 className="text-sm font-semibold">Join with a code</h2>
        <Input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          placeholder="ROOM CODE"
          aria-label="Room code"
          className="font-mono tracking-widest"
          maxLength={6}
        />
        <Button type="submit" variant="outline" className="w-full">
          Join room
        </Button>
      </form>
    </main>
  );
}
