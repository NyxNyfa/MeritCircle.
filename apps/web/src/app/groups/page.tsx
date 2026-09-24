"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "../../components/layout/Shell";
import { LoadingState } from "@merit-circle/ui";
import { AppProviders } from "../../providers/AppProviders";

function GroupsRedirectContent() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <Shell activeHref="/dashboard">
      <LoadingState message="Mengalihkan ke daftar kelompok aktif..." />
    </Shell>
  );
}

export default function GroupsIndexPage() {
  return (
    <AppProviders>
      <GroupsRedirectContent />
    </AppProviders>
  );
}
