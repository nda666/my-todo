import React, {
  useMemo,
  useState,
} from 'react';

import {
  Button,
  Card,
  Empty,
  message,
  Segmented,
  Spin,
  Typography,
} from 'antd';

import {
  AppstoreOutlined,
  PlusOutlined,
  TableOutlined,
} from '@ant-design/icons';
import {
  useMutation,
  useQuery,
} from '@apollo/client';

import CreateTaskModal from '../components/CreateTaskModal';
import TaskCard from '../components/TaskCard';
import TaskStatusTabs from '../components/TaskStatusTabs';
import TaskTable from '../components/TaskTable';
import { useAuth } from '../contexts/AuthContext';
import { useInfiniteScrollSentinel } from '../hooks/useInfiniteScrollSentinel';
import { useInfiniteTasks } from '../hooks/useInfiniteTasks';
import { useLocalStorageState } from '../hooks/useLocalStorageState';
import DefaultLayout from '../layouts/DefaultLayout';
import {
  ADD_COMMENT,
  CREATE_TASK,
  DELETE_META,
  DELETE_TASK,
  GET_COLLEAGUES,
  GET_TEAM_OVERVIEW,
  REORDER_META,
  SET_META,
  TOGGLE_REACTION,
  UPDATE_TASK,
} from '../lib/queries';
import {
  Colleague,
  MetaDraft,
  Task,
  TaskStatus,
} from '../types/task';
import {
  countTasksByTab,
  filterTasksByTab,
  StatusTabKey,
} from '../utils/taskFilters';

const { Title, Text } = Typography

export default function Dashboard() {
  const { me } = useAuth()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [viewMode, setViewMode] = useLocalStorageState<'card' | 'table'>('task_view_mode', 'card')
  const [statusTab, setStatusTab] = useState<StatusTabKey>('all')

  const isLeader = me?.pegawai?.statusLeader === 1

  // --- Baca data (loading cuma di initial load, polling ringan untuk "realtime") ---
  const { tasks, loading, loadingMore, hasMore, loadMore } = useInfiniteTasks(me?.kodeku || null)
  const sentinelRef = useInfiniteScrollSentinel(loadMore, hasMore && !loading)

  const { data: colleaguesData } = useQuery(GET_COLLEAGUES, { pollInterval: 30000 })
  const colleagues: Colleague[] = colleaguesData?.colleagues || []
  const teamMembers = useMemo(() => colleagues.filter((c) => c.kodeku !== me?.kodeku), [colleagues, me?.kodeku])

  // ringkasan jumlah task per kolega untuk badge sidebar - polling ringan, bukan manual reload
  const { data: overviewData } = useQuery(GET_TEAM_OVERVIEW,
    { pollInterval: 30000 }
  )
  const teamTaskCounts = useMemo(() => {
    const counts: Record<string, number> = {}
      ; (overviewData?.tasks?.tasks || []).forEach((t: { userKode: string }) => {
        counts[t.userKode] = (counts[t.userKode] || 0) + 1
      })
    return counts
  }, [overviewData])

  // --- Mutations: cache di-update langsung, tanpa refetch/reload manual ---
  const [createTaskMutation, { loading: creating }] = useMutation(CREATE_TASK, {
    update(cache, { data }) {
      const newTask = data.createTask
      cache.modify({
        fields: {
          tasks(existing = { tasks: [], nextCursor: null, hasMore: false }) {
            return { ...existing, tasks: [{ __ref: cache.identify(newTask) }, ...existing.tasks] }
          },
        },
      })
    },
  })

  const [updateTaskMutation] = useMutation(UPDATE_TASK)
  const [deleteTaskMutation] = useMutation(DELETE_TASK)
  const [addCommentMutation] = useMutation(ADD_COMMENT)
  const [toggleReactionMutation] = useMutation(TOGGLE_REACTION)
  const [setMetaMutation] = useMutation(SET_META)
  const [deleteMetaMutation] = useMutation(DELETE_META)
  const [reorderMetaMutation] = useMutation(REORDER_META)

  const handleCreate = async (values: { title: string; description?: string; meta: MetaDraft[]; startDate?: string; dueDate?: string }) => {
    try {
      await createTaskMutation({
        variables: {
          input: {
            title: values.title.trim(),
            description: values.description?.trim() || null,
            meta: values.meta.filter((m) => m.key.trim()).map((m) => ({ key: m.key.trim(), value: m.value || null, type: m.type })),
          },
        },
      })
      setIsCreateModalOpen(false)
      // tidak ada message.success - task baru langsung muncul di list, itu konfirmasinya
    } catch (err: any) {
      message.error(err.message || 'Gagal menambahkan task')
    }
  }

  const handleUpdate = (id: string, input: { title?: string; description?: string | null; status?: TaskStatus }) => {
    updateTaskMutation({
      variables: { id, input },
      optimisticResponse: {
        updateTask: { __typename: 'Task', id, ...input, updatedAt: new Date().toISOString() },
      },
    }).catch((err) => message.error(err.message || 'Gagal memperbarui status'))
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
      // task langsung hilang dari list - tidak perlu notif sukses
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
    toggleReactionMutation({ variables: { commentId, emoji } }).catch((err) =>
      message.error(err.message || 'Gagal memberi reaksi')
    )
  }

  const handleSetMeta = async (taskId: string, key: string, value: string | null, type: MetaDraft['type']) => {
    const { data } = await setMetaMutation({ variables: { taskId, key, value, type } })
    return data.setTaskMeta
  }

  const handleDeleteMeta = async (id: string) => {
    await deleteMetaMutation({ variables: { id } })
  }

  const handleReorderMeta = (taskId: string, orderedIds: string[]) => {
    reorderMetaMutation({ variables: { taskId, orderedIds } }).catch((err) =>
      message.error(err.message || 'Gagal mengubah urutan info tambahan')
    )
  }

  const canManageTask = (task: Task) => task.userKode === me?.kodeku || task.createdBy === me?.kodeku

  const stats = {
    total: teamTaskCounts[me?.kodeku || ''] || 0,
    pending: tasks.filter((t) => t.status === 'PENDING').length,
    inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    completed: tasks.filter((t) => t.status === 'COMPLETED').length,
  }

  const filteredTasks = filterTasksByTab(tasks, statusTab)
  const counts = countTasksByTab(tasks)

  return (
    <DefaultLayout
      title="Daftar Tugas Anda"
      teamMembers={teamMembers}
      teamTaskCounts={teamTaskCounts}
      stats={stats}
      onCreateTask={() => setIsCreateModalOpen(true)}
    >
      {loading ? (
        <div className="flex flex-col justify-center items-center py-20 gap-4 !bg-white dark:!bg-slate-900 !border !border-slate-200 dark:!border-slate-800 rounded-xl shadow-sm">
          <Spin size="large" />
          <Text type="secondary">Memuat daftar tugas...</Text>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4 px-1">
            <div>
              <Title level={5} className="!mb-0 font-semibold !text-slate-800 dark:!text-slate-200">Task Saya</Title>
              <Text className="text-xs !text-slate-500 dark:!text-slate-400">
                Perbarui status tugas atau edit rincian tugas secara langsung
              </Text>
            </div>
            <div className="flex items-center gap-2">
              <Segmented
                value={viewMode}
                onChange={(val) => setViewMode(val as 'card' | 'table')}
                options={[
                  { label: 'Card', value: 'card', icon: <AppstoreOutlined /> },
                  { label: 'Table', value: 'table', icon: <TableOutlined /> },
                ]}
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateModalOpen(true)} className="rounded-lg">
                Task Baru
              </Button>
            </div>
          </div>

          <div className="mb-4">
            <TaskStatusTabs activeKey={statusTab} onChange={setStatusTab} counts={counts} />
          </div>

          {tasks.length === 0 ? (
            <Card className="!border !border-dashed !border-slate-300 dark:!border-slate-850 rounded-xl !bg-white dark:!bg-slate-900 text-center py-16 shadow-sm">
              <Empty
                description={<span className="!text-slate-500 dark:!text-slate-400 font-light">Belum ada task. Klik tombol <strong>Task Baru</strong> untuk memulainya!</span>}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </Card>
          ) : filteredTasks.length === 0 ? (
            <Card className="!border !border-dashed !border-slate-300 dark:!border-slate-850 rounded-xl !bg-white dark:!bg-slate-900 text-center py-12 shadow-sm">
              <Empty description={<span className="!text-slate-500 dark:!text-slate-400 font-light">Tidak ada task di tab ini.</span>} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </Card>
          ) : viewMode === 'table' ? (
            <>
              <TaskTable
                tasks={filteredTasks}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onAddComment={handleAddComment}
                onToggleReaction={handleToggleReaction}
                onSetMeta={handleSetMeta}
                onDeleteMeta={handleDeleteMeta}
                onReorderMeta={handleReorderMeta}
                isRowEditable={canManageTask}
              />
              <div ref={sentinelRef} />
              {loadingMore && <div className="text-center py-4"><Spin /></div>}
            </>
          ) : (
            <div>
              {filteredTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  onAddComment={handleAddComment}
                  onToggleReaction={handleToggleReaction}
                  onSetMeta={handleSetMeta}
                  onDeleteMeta={handleDeleteMeta}
                  onReorderMeta={handleReorderMeta}
                  readOnly={!canManageTask(task)}
                />
              ))}
              <div ref={sentinelRef} />
              {loadingMore && <div className="text-center py-4"><Spin /></div>}
            </div>
          )}
        </>
      )}

      <CreateTaskModal
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        onCreate={handleCreate}
        loading={creating}
      />
    </DefaultLayout>
  )
}