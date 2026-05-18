import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface LoadingButtonProps extends ButtonProps {
  /** Khi `true`, hiển thị spinner và disable button. */
  loading?: boolean;
  /** Text hiện trong khi loading (mặc định giữ nguyên children). */
  loadingText?: string;
}

/**
 * `LoadingButton` — bọc `Button` shadcn, thêm spinner + lock width
 * để không gây CLS khi state thay đổi.
 *
 * Dùng cho mutation buttons trong booking, favorites, auth.
 */
export const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ loading, loadingText, disabled, children, className, ...rest }, ref) => {
    const isDisabled = disabled || loading;
    return (
      <Button
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        data-loading={loading || undefined}
        className={cn(className)}
        {...rest}
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            <span>{loadingText ?? children}</span>
          </>
        ) : (
          children
        )}
      </Button>
    );
  },
);
LoadingButton.displayName = "LoadingButton";
