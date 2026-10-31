import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { Spinner } from "@/components/Spinner";
import { StyledButton, StyledLink } from "./styled";
import type { ButtonVariant, LookProps } from "./styled";

interface LookOptions {
  variant?: ButtonVariant;
  small?: boolean;
  block?: boolean;
  /** The arrow on the right edge, as in the design. */
  arrow?: boolean;
  children: ReactNode;
}

interface ButtonOptions extends LookOptions {
  /** A request is running: the button stops taking presses and shows the spinner where the arrow was. */
  loading?: boolean;
}

type ButtonProps = ButtonOptions & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;
type ButtonLinkProps = LookOptions &
  Omit<ComponentProps<typeof StyledLink>, "children" | keyof LookOptions | keyof LookProps>;

const Arrow = () => <span aria-hidden="true">→</span>;

export function Button({
  variant = "primary",
  small = false,
  block = false,
  arrow = true,
  loading = false,
  disabled = false,
  children,
  ...rest
}: ButtonProps) {
  return (
    <StyledButton
      type="button"
      data-variant={variant}
      $variant={variant}
      $small={small}
      $block={block}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {children}
      {loading ? <Spinner /> : arrow ? <Arrow /> : null}
    </StyledButton>
  );
}

/** A link that looks like a button. Use it to go somewhere, and `Button` to do something. */
export function ButtonLink({
  variant = "primary",
  small = false,
  block = false,
  arrow = true,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <StyledLink data-variant={variant} $variant={variant} $small={small} $block={block} {...rest}>
      {children}
      {arrow ? <Arrow /> : null}
    </StyledLink>
  );
}
