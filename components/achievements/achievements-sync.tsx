"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Confetti } from "@/components/ui/confetti";
import { useToast } from "@/components/ui/toast";
import { syncAchievements } from "@/lib/actions/achievements";

/**
 * On mount, reconcile earned achievements and celebrate any newly-unlocked
 * (or levelled-up) badges with confetti + a toast, then refresh so their
 * earned dates render.
 */
export function AchievementsSync() {
  const router = useRouter();
  const toast = useToast();
  const [celebrate, setCelebrate] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    syncAchievements()
      .then((res) => {
        if (res.ok && res.newlyEarned.length > 0) {
          setCelebrate(true);
          const n = res.newlyEarned.length;
          toast(`${n} new achievement${n === 1 ? "" : "s"} unlocked! 🎉`, "success");
          router.refresh();
          window.setTimeout(() => setCelebrate(false), 5000);
        }
      })
      .catch(() => {});
  }, [router, toast]);

  return celebrate ? <Confetti /> : null;
}
