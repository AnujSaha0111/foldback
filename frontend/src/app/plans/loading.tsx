import { Bone, Skeleton, Stack } from "@/components/Skeleton";

/** Shown while a plans route loads: a heading, a line and the main panel. */
export default function PlansLoading() {
  return (
    <Skeleton label="Loading…">
      <Stack $gap="var(--s-5)">
        <Bone $w="14rem" $h="2.5rem" />
        <Bone $w="24rem" />
        <Bone $h="18rem" />
      </Stack>
    </Skeleton>
  );
}
