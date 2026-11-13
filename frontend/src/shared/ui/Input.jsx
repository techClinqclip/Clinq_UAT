import { forwardRef, useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const Input = forwardRef(function Input(
  { label, hint, error, type = "text", className = "", ...rest },
  ref
) {
  const innerId = useId();
  const hintId = useId();
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;
  const describedBy = (hint || error) ? hintId : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={innerId}
          className="text-sm font-medium text-zinc-300"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <input
          ref={ref}
          id={innerId}
          type={inputType}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={[
            "w-full rounded-xl border bg-surface-2 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 transition",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1 focus-visible:ring-offset-surface-2",
            error
              ? "border-red-500/60 focus-visible:ring-red-500"
              : "border-white/10 focus-visible:border-white/20",
            isPassword ? "pr-10" : "",
            className,
          ].join(" ")}
          {...rest}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>

      {(hint || error) && (
        <p
          id={hintId}
          className={`text-xs ${error ? "text-red-400" : "text-zinc-500"}`}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
});

export default Input;
