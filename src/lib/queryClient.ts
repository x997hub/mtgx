import { QueryClient, type Mutation } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";
import { getErrorKey } from "@/lib/errorMapping";
import i18n from "i18next";

function handleGlobalError(error: unknown, _mutation?: Mutation) {
  const key = getErrorKey(error);
  const message = i18n.isInitialized ? i18n.t(key) : key;
  toast({ title: message, variant: "destructive" });
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      gcTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
      onError: (error) => handleGlobalError(error),
    },
  },
});
