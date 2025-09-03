// components/sheets/SettingsSheet.tsx
import * as React from "react";
import BottomSheet from "./BottomSheets";
import ThemeToggle from "../ThemeToggle";

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsSheet({ open, onClose }: SettingsSheetProps) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      header={<h3 className="font-medium text-foreground">Settings</h3>}
    >
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-foreground">Dark Mode</span>
          <ThemeToggle />
        </div>
      </div>
    </BottomSheet>
  );
}
