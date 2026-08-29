import { InputHTMLAttributes, forwardRef } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

/**
 * Clean, flat text input. Border by default, ring + accent on focus.
 * Label uses secondary text, hint uses tertiary.
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, hint, id, className = "", ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-text-secondary"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition-all duration-150 ease-out placeholder:text-text-tertiary focus:border-accent focus:ring-2 focus:ring-accent/30 ${className}`}
          {...props}
        />
        {hint && <p className="text-xs text-text-tertiary">{hint}</p>}
      </div>
    );
  }
);
TextField.displayName = "TextField";
