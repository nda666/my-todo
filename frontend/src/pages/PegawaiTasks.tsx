import React, {
  useCallback,
  useState,
} from 'react';

import {
  Card,
  Empty,
  Layout,
  Segmented,
  Spin,
  Typography,
} from 'antd';
import {
  useNavigate,
  useParams,
} from 'react-router-dom';

import {
  AppstoreOutlined,
  TableOutlined,
} from '@ant-design/icons';

import TaskCard from '../components/TaskCard';
import TaskStatusTabs from '../components/TaskStatusTabs';
import TaskTable from '../components/TaskTable';
import { useAuth } from '../contexts/AuthContext';
import { useInfiniteScrollSentinel } from '../hooks/useInfiniteScrollSentinel';
import { useInfiniteTasks } from '../hooks/useInfiniteTasks';
import { useLocalStorageState } from '../hooks/useLocalStorageState';
import TeamLayout from '../layouts/TeamLayout';
import { graphql } from '../lib/auth';
import { CloudinaryUploadResult } from '../lib/cloudinary';
import {
  ADD_COMMENT,
  DELETE_META,
  DELETE_TASK,
  REORDER_META,
  SET_META,
  TOGGLE_REACTION,
  UPDATE_TASK,
} from '../lib/queries';
import {
  MetaDraft,
  Task,
} from '../types/task';
import {
  countTasksByTab,
  filterTasksByTab,
  StatusTabKey,
} from '../utils/taskFilters';

const { Header, Content } = Layout
const { Title, Text } = Typography

export default function PegawaiTasks() {
    const { me, logout } = useAuth()
    const navigate = useNavigate()
    const { divisiId, pegawaiId } = useParams<{ divisiId: string; pegawaiId: string }>()
    const [viewMode, setViewMode] = useLocalStorageState<'card' | 'table'>('task_view_mode', 'card')
    const [statusTab, setStatusTab] = useState<StatusTabKey>('all')

    const isLeader = me?.pegawai?.statusLeader === 1
    const currentDivisiKode = me?.pegawai?.divisi?.kode || null
    const isOwnPage = pegawaiId === me?.kodeku

    const { tasks, loading, loadingMore, hasMore, loadMore, reload } = useInfiniteTasks(pegawaiId || null)
    const sentinelRef = useInfiniteScrollSentinel(loadMore, hasMore && !loading)

    const handleUpdate = async (id: string, input: any) => { await graphql(UPDATE_TASK, { id, input }); reload() }
    const handleDelete = async (id: string) => { await graphql(DELETE_TASK, { id }); reload() }
    const handleAddComment = async (taskId: string, content: string, parentId: string | null, attachments: CloudinaryUploadResult[]) => {
        await graphql(ADD_COMMENT, { taskId, content, parentId, attachments }); reload()
    }
    const handleToggleReaction = async (commentId: string, emoji: string) => { await graphql(TOGGLE_REACTION, { commentId, emoji }); reload() }
    const handleSetMeta = async (taskId: string, key: string, value: string | null, type: MetaDraft['type']) => {
        const data = await graphql(SET_META, { taskId, key, value, type }); reload(); return data.setTaskMeta
    }
    const handleDeleteMeta = async (id: string) => { await graphql(DELETE_META, { id }) }
    const handleReorderMeta = async (taskId: string, orderedIds: string[]) => { await graphql(REORDER_META, { taskId, orderedIds }); reload() }

    const canManageTask = useCallback(
        (task: Task) => task.userKode === me?.kodeku || task.createdBy === me?.kodeku,
        [me?.kodeku]
    )

    const filteredTasks = filterTasksByTab(tasks, statusTab)
    const counts = countTasksByTab(tasks)

    return (
        <TeamLayout
            title={isOwnPage ? 'Task Saya' : 'Task Pegawai'}
            onBack={() => navigate(`/teams/${divisiId}`)}
            storageKey="teams_sidebar_collapsed"
        >
            {loading ? (
                <div className="flex flex-col justify-center items-center py-20 gap-4 !bg-white dark:!bg-slate-900 !border !border-slate-200 dark:!border-slate-800 rounded-xl shadow-sm">
                    <Spin size="large" />
                    <Text type="secondary">Memuat daftar tugas...</Text>
                </div>
            ) : (
                <>
                    <div className="flex items-center justify-between mb-4 px-1">
                        <Text className="text-xs !text-slate-500 dark:!text-slate-400">
                            {isOwnPage ? 'Perbarui status tugas atau edit rincian secara langsung' : 'Task yang Anda buatkan bisa diedit, sisanya hanya bisa dilihat'}
                        </Text>
                        <Segmented
                            value={viewMode}
                            onChange={(val) => setViewMode(val as 'card' | 'table')}
                            options={[
                                { label: 'Card', value: 'card', icon: <AppstoreOutlined /> },
                                { label: 'Table', value: 'table', icon: <TableOutlined /> },
                            ]}
                        />
                    </div>

                    <div className="mb-4">
                        <TaskStatusTabs activeKey={statusTab} onChange={setStatusTab} counts={counts} />
                    </div>

                    {tasks.length === 0 ? (
                        <Card className="!border !border-dashed !border-slate-300 dark:!border-slate-850 rounded-xl !bg-white dark:!bg-slate-900 text-center py-16 shadow-sm">
                            <Empty description={<span className="!text-slate-500 dark:!text-slate-400 font-light">Belum ada task.</span>} image={Empty.PRESENTED_IMAGE_SIMPLE} />
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
        </TeamLayout>
    )
}