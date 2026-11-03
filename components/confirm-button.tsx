"use client";

import type { ComponentProps } from "react";
import { useLayoutEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function ConfirmButton({
  label,
  title,
  description,
  confirmLabel,
  onConfirm,
  ...buttonProps
}: {
  label: string;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
} & Omit<ComponentProps<typeof Button>, "onClick" | "children" | "title">) {
  const [open, setOpen] = useState(false);

  // Routes stay mounted but hidden on navigation, so close the dialog when this one
  // hides. Otherwise it would still be open when the person navigates back.
  useLayoutEffect(() => () => setOpen(false), []);

  return (
    <>
      <Button {...buttonProps} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => {
                setOpen(false);
                onConfirm();
              }}
            >
              {confirmLabel}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
