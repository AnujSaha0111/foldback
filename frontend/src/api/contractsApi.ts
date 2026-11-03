import type {
  AgentResponse,
  ConfirmTerms,
  ContractRead,
  ContractSummary,
  ResetResponse,
  RuleResult,
} from "@/types/generated/api-types";
import { baseApi } from "./baseApi";

interface ReadRuleBody {
  rule_text: string;
  use_fixture_time?: boolean;
}

const contractsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getContracts: build.query<ContractSummary[], void>({
      query: () => "/api/contracts",
      transformResponse: (response: { contracts: ContractSummary[] }) => response.contracts,
      providesTags: ["ContractList"],
    }),
    getContract: build.query<ContractRead, string>({
      query: (id) => `/api/contracts/${encodeURIComponent(id)}`,
      providesTags: (_result, _error, id) => [{ type: "Contract", id }],
    }),
    // Both of these leave a plan behind, even when it needs an answer, so the list refreshes either way.
    readRule: build.mutation<RuleResult, ReadRuleBody>({
      query: (body) => ({ url: "/api/contracts", method: "POST", body }),
      invalidatesTags: ["ContractList"],
    }),
    clarifyRule: build.mutation<RuleResult, { id: string; answer: string }>({
      query: ({ id, answer }) => ({
        url: `/api/contracts/${encodeURIComponent(id)}/clarify`,
        method: "POST",
        body: { answer },
      }),
      invalidatesTags: ["ContractList"],
    }),
    confirmRule: build.mutation<ContractRead, { id: string; terms: ConfirmTerms }>({
      query: ({ id, terms }) => ({
        url: `/api/contracts/${encodeURIComponent(id)}/confirm`,
        method: "POST",
        body: terms,
      }),
      invalidatesTags: (_result, _error, { id }) => ["ContractList", { type: "Contract", id }],
    }),
    /** Moves the demo clock, then the server resolves. A 409 still moved the clock, so the board refreshes anyway. */
    moveClock: build.mutation<ContractRead, { id: string; demoNow: string; viaAgent?: boolean }>({
      query: ({ id, demoNow, viaAgent }) => ({
        url: `/api/contracts/${encodeURIComponent(id)}/clock${viaAgent ? "?via=agent" : ""}`,
        method: "POST",
        body: { demo_now: demoNow },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        "ContractList",
        { type: "Contract", id },
        { type: "Scheduler", id },
      ],
    }),
    resolvePlan: build.mutation<ContractRead, { id: string; viaAgent?: boolean }>({
      query: ({ id, viaAgent }) => ({
        url: `/api/contracts/${encodeURIComponent(id)}/resolve${viaAgent ? "?via=agent" : ""}`,
        method: "POST",
        body: {},
      }),
      invalidatesTags: (_result, _error, { id }) => [
        "ContractList",
        { type: "Contract", id },
        { type: "Scheduler", id },
      ],
    }),
    /** One assistant turn. Nothing it proposes has happened: the organizer approves through the clock or resolve route. */
    askAgent: build.mutation<
      AgentResponse,
      { id: string; messages: { role: "user" | "assistant"; content: string }[] }
    >({
      query: ({ id, messages }) => ({
        url: `/api/contracts/${encodeURIComponent(id)}/agent`,
        method: "POST",
        body: { messages },
      }),
    }),
    resetDemo: build.mutation<ResetResponse, void>({
      query: () => ({ url: "/api/demo/reset", method: "POST", body: {} }),
      invalidatesTags: ["ContractList", "Contract"],
    }),
  }),
});

/** Lets every user of the reset mutation see the same result, however far apart they are on the page. */
export const DEMO_RESET_KEY = "demo-reset";

/** A plan as it already sits in the cache, without asking the API (the header uses it to name the open board). */
export const useCachedContract = contractsApi.endpoints.getContract.useQueryState;

export const {
  useGetContractsQuery,
  useGetContractQuery,
  useReadRuleMutation,
  useClarifyRuleMutation,
  useConfirmRuleMutation,
  useResetDemoMutation,
  useMoveClockMutation,
  useResolvePlanMutation,
  useAskAgentMutation,
} = contractsApi;
