import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { Chat } from "@/components/Chat";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/messages")({
  head: () => ({
    meta: [
      { title: "Chat with BrightRide management" },
      {
        name: "description",
        content:
          "Message the BrightRide team about pickups, deliveries and cleaning, and send photos of your items.",
      },
      { property: "og:title", content: "Chat with BrightRide management" },
      {
        property: "og:description",
        content: "Message the BrightRide team and share photos of your items.",
      },
    ],
  }),
  component: () => (
    <Guard allow={["customer", "admin"]}>
      <Messages />
    </Guard>
  ),
});

function Messages() {
  const { user } = useAuth();
  return (
    <AppShell>
      <PageHeader title="Messages" subtitle="Talk to BrightRide management" />
      {user ? <Chat customerId={user.id} senderId={user.id} asStaff={false} /> : null}
    </AppShell>
  );
}
