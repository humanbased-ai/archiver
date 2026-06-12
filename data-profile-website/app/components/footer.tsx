import { cn } from "@udecode/cn";

export default function Footer({ className }: { className?: string }) {
  return (
    <div className={cn("text-gray-5 py-10 text-center text-xs", className)}>
      © 2024 - Codatta Labs Inc. All Rights Reserved.
    </div>
  );
}
