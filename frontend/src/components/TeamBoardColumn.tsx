import React from 'react';

import {
    Empty,
    message,
    Spin,
} from 'antd';

import { useMutation } from '@apollo/client';

import { useInfiniteScrollSentinel } from '../hooks/useInfiniteScrollSentinel';
import { useInfiniteTasks } from '../hooks/useInfiniteTasks';
import {
    ADD_COMMENT,
    DELETE_META,
    DELETE_TASK,
    REORDER_META,
    SET_META,
    TOGGLE_REACTION,
    UPDATE_TASK,
} from '../lib/queries';
import TeamBoardTaskCard from './TeamBoardTaskCard';

export default function TeamBoardColumn({ userKode, editable }: { userKode: string; editable: boolean }) {
    const { tasks, loading, loadingMore, hasMore, loadMore } = useInfiniteTasks(userKode)
    const sentinelRef = useInfiniteScrollSentinel(loadMore, hasMore && !loading)

    const [updateTaskMutation] = useMutation(UPDATE_TASK)
    const [deleteTaskMutation] = useMutation(DELETE_TASK)
    const [addCommentMutation] = useMutation(ADD_COMMENT)
    const [toggleReactionMutation] = useMutation(TOGGLE_REACTION)
    const [setMetaMutation] = useMutation(SET_META)
    const [deleteMetaMutation] = useMutation(DELETE_META)
    const [reorderMetaMutation] = useMutation(REORDER_META)

    const handleUpdate = (id: string, input: any) => {
        updateTaskMutation({
            variables: { id, input },
            optimisticResponse: { updateTask: { __typename: 'Task', id, ...input, updatedAt: new Date().toISOString() } },
        }).catch((err) => message.error(err.message || 'Gagal memperbarui task'))
    }

    const handleDelete = async (id: string) => {
        try {
            await deleteTaskMutation({
                variables: { id },
                update(cache) {
                    cache.evict({ id: cache.identify({ __typename: 'Task', id }) })
                    cache.gc()
                },
            })
        } catch (err: any) {
            message.error(err.message || 'Gagal menghapus task')
        }
    }

    const handleAddComment = async (taskId: string, content: string, parentId: string | null, attachments: any[]) => {
        try {
            await addCommentMutation({ variables: { taskId, content, parentId, attachments } })
        } catch (err: any) {
            message.error(err.message || 'Gagal menambahkan komentar')
        }
    }

    const handleToggleReaction = (commentId: string, emoji: string) => {
        toggleReactionMutation({ variables: { commentId, emoji } }).catch((err) => message.error(err.message || 'Gagal memberi reaksi'))
    }

    const handleSetMeta = async (taskId: string, key: string, value: string | null, type: any) => {
        const { data } = await setMetaMutation({ variables: { taskId, key, value, type } })
        return data.setTaskMeta
    }

    const handleDeleteMeta = async (id: string) => {
        await deleteMetaMutation({ variables: { id } })
    }

    const handleReorderMeta = (taskId: string, orderedIds: string[]) => {
        reorderMetaMutation({ variables: { taskId, orderedIds } }).catch((err) => message.error(err.message || 'Gagal mengubah urutan'))
    }

    if (loading) {
        return <div className="flex justify-center py-10"><Spin /></div>
    }

    if (tasks.length === 0) {
        return (
            <div className="!bg-white dark:!bg-slate-900 !border !border-dashed !border-slate-300 dark:!border-slate-800 rounded-xl py-10">
                <Empty description={<span className="text-xs !text-slate-400">Belum ada task</span>} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </div>
        )
    }

    return (
        <div className="max-h-[75vh] overflow-y-auto pr-1">
            {tasks.map((task) => (
                <TeamBoardTaskCard
                    key={task.id}
                    task={task}
                    editable={editable}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    onAddComment={handleAddComment}
                    onToggleReaction={handleToggleReaction}
                    onSetMeta={handleSetMeta}
                    onDeleteMeta={handleDeleteMeta}
                    onReorderMeta={handleReorderMeta}
                />
            ))}
            <div ref={sentinelRef} />
            {loadingMore && <div className="text-center py-3"><Spin size="small" /></div>}
        </div>
    )
}