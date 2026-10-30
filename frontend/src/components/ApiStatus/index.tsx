"use client";

import { useGetHealthQuery } from "@/api/healthApi";
import { StatusTag } from "@/components/StatusTag";
import type { StatusView } from "@/lib/status";
import { Detail, Line } from "./styled";

const CHECKING: StatusView = { label: "Checking", tone: "waiting" };
const UP: StatusView = { label: "Online", tone: "kept" };
const DOWN: StatusView = { label: "Unreachable", tone: "failed" };

/** Proves the browser can reach the API (CORS, cookies, URL). It stays until the real screens replace it. */
export function ApiStatus() {
  const { data, isLoading, isError } = useGetHealthQuery();
  const view = isLoading ? CHECKING : isError || !data ? DOWN : UP;
  return (
    <Line role="status">
      Server
      <StatusTag view={view} />
      {data ? (
        <Detail>
          v{data.version} · PayPal {data.paypal_env}
        </Detail>
      ) : null}
    </Line>
  );
}
