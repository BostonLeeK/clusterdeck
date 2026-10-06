import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "ClusterDeck · Map your infrastructure. Together.",
  description:
    "A live, collaborative canvas for your architecture. Services, data and traffic in one diagram your team and AI agents can edit.",
  openGraph: {
    title: "ClusterDeck · Map your infrastructure. Together.",
    description: "A live, collaborative canvas for your architecture.",
    url: "/",
    siteName: "ClusterDeck",
    type: "website",
  },
};

export default async function HomePage() {
  const session = await auth();
  return <LandingPage signedIn={Boolean(session?.user)} />;
}
