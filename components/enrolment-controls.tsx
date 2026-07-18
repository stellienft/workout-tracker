"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  pauseEnrolment,
  resumeEnrolment,
  restartEnrolment,
} from "@/lib/actions/enrolment";

export function EnrolmentControls({
  enrolmentId,
  status,
}: {
  enrolmentId: string;
  status: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        toast(msg, "success");
        router.refresh();
      } else {
        toast(res.error ?? "Something went wrong", "error");
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "active" ? (
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => run(() => pauseEnrolment(enrolmentId), "Program paused")}
        >
          Pause program
        </Button>
      ) : (
        <Button
          disabled={pending}
          onClick={() => run(() => resumeEnrolment(enrolmentId), "Program resumed")}
        >
          Resume program
        </Button>
      )}
      <Button
        variant="ghost"
        disabled={pending}
        onClick={() => {
          if (confirm("Restart this program from week 1? Your logged history is kept."))
            run(() => restartEnrolment(enrolmentId), "Program restarted");
        }}
      >
        Restart
      </Button>
    </div>
  );
}
