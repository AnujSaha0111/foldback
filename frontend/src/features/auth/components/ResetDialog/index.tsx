"use client";

import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { useRouter } from "next/navigation";
import { DEMO_RESET_KEY, useResetDemoMutation } from "@/api/contractsApi";
import { Button } from "@/components/Button";
import { FormError } from "@/components/FormError";
import { RESET_HOLDS_WARNING } from "@/types/generated/rules";

interface ResetDialogProps {
  onClose: () => void;
}

/** Resets only the signed-in user's plans, back to the two samples. */
export function ResetDialog({ onClose }: ResetDialogProps) {
  const router = useRouter();
  const [resetDemo, { isLoading, error, reset: clearError }] = useResetDemoMutation({
    fixedCacheKey: DEMO_RESET_KEY,
  });

  const reset = async () => {
    const result = await resetDemo();
    if ("error" in result) return;
    onClose();
    router.push("/plans");
  };

  // The result is shared, so a refused reset would otherwise greet the next visitor to this dialog.
  const close = () => {
    if (error) clearError();
    onClose();
  };

  return (
    <Dialog open onClose={close} aria-labelledby="reset-title" aria-describedby="reset-warning">
      <DialogTitle id="reset-title">Reset demo data?</DialogTitle>
      <DialogContent>
        <DialogContentText id="reset-warning">
          Your plans go back to the two samples. {RESET_HOLDS_WARNING}
        </DialogContentText>
        <FormError error={error} />
      </DialogContent>
      <DialogActions>
        <Button variant="secondary" small arrow={false} onClick={close}>
          Keep my plans
        </Button>
        <Button small arrow={false} loading={isLoading} onClick={() => void reset()}>
          {isLoading ? "Resetting…" : "Reset"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
