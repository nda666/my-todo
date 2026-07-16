import { useCallback } from "react";

import { useQuery } from "@apollo/client";

import { GET_TASKS } from "../lib/queries";
import { Task } from "../types/task";

const PAGE_SIZE = 20;

export function useInfiniteTasks(userKode?: string | null) {
  const { data, loading, fetchMore, networkStatus } = useQuery(GET_TASKS, {
    variables: { limit: PAGE_SIZE, cursor: null, userKode: userKode || null },
    notifyOnNetworkStatusChange: true,
    skip: userKode === undefined,
  });

  const tasks: Task[] = data?.tasks?.tasks || [];
  const hasMore: boolean = data?.tasks?.hasMore || false;
  const nextCursor: string | null = data?.tasks?.nextCursor || null;
  const loadingMore = networkStatus === 3; // fetchMore in-flight

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore || !nextCursor) return;
    fetchMore({
      variables: {
        limit: PAGE_SIZE,
        cursor: nextCursor,
        userKode: userKode || null,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        return {
          tasks: {
            ...fetchMoreResult.tasks,
            tasks: [...prev.tasks.tasks, ...fetchMoreResult.tasks.tasks],
          },
        };
      },
    });
  }, [hasMore, loadingMore, nextCursor, userKode, fetchMore]);

  return { tasks, loading: loading && !data, loadingMore, hasMore, loadMore };
}
