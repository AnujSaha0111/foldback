import { Root } from "./styled";
import type { AvatarSize } from "./styled";

interface AvatarProps {
  name: string;
  size?: AvatarSize;
}

/** "Alex Chen" becomes "AC". Decorative: the name always appears next to it. */
export function Avatar({ name, size = "md" }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
  return (
    <Root $size={size} aria-hidden="true">
      {initials}
    </Root>
  );
}
