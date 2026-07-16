import React, {
    useEffect,
    useState,
} from 'react';

import {
    Button,
    Form,
    Input,
    Modal,
    Select,
    Typography,
} from 'antd';

import { STATUS_OPTIONS } from '../constants/taskStatus';
import {
    MetaDraft,
    Task,
    TaskStatus,
} from '../types/task';
import TaskMetaEditor from './TaskMetaEditor';

const { Title } = Typography
const { TextArea } = Input

interface EditTaskFormValues {
    title: string
    description?: string
    status: TaskStatus
}

interface TaskEditModalProps {
    open: boolean
    task: Task | null
    onCancel: () => void
    onSubmit: (id: string, values: { title: string; description?: string | null; status: TaskStatus }) => Promise<void>
    onSetMeta: (taskId: string, key: string, value: string | null, type: MetaDraft['type']) => Promise<{ id: string }>
    onDeleteMeta: (id: string) => Promise<void>
    onReorderMeta: (taskId: string, orderedIds: string[]) => void
    loading: boolean
}

export default function TaskEditModal({ open, task, onCancel, onSubmit, onSetMeta, onDeleteMeta, onReorderMeta, loading }: TaskEditModalProps) {
    const [form] = Form.useForm<EditTaskFormValues>()
    const [metaItems, setMetaItems] = useState<MetaDraft[]>([])
    const [savingMeta, setSavingMeta] = useState(false)

    useEffect(() => {
        if (task && open) {
            form.setFieldsValue({
                title: task.title,
                description: task.description || undefined,
                status: task.status,
            })
            setMetaItems(
                task.meta.map((m) => ({
                    draftId: m.id,
                    id: m.id,
                    key: m.key,
                    value: m.value || '',
                    type: m.type,
                }))
            )
        }
    }, [task, open, form])

    const handleFinish = async (values: EditTaskFormValues) => {
        if (!task) return

        await onSubmit(task.id, {
            title: values.title.trim(),
            description: values.description?.trim() || null,
            status: values.status,
        })

        // Sinkronkan Info Tambahan: hapus semua yang lama, buat ulang dari isi form saat ini.
        setSavingMeta(true)
        try {
            const originalIds = task.meta.map((m) => m.id)
            for (const id of originalIds) {
                await onDeleteMeta(id)
            }
            const newIds: string[] = []
            for (const item of metaItems) {
                if (!item.key.trim()) continue
                const created = await onSetMeta(task.id, item.key.trim(), item.value || null, item.type)
                if (created?.id) newIds.push(created.id)
            }
            if (newIds.length > 0) {
                await onReorderMeta(task.id, newIds)
            }
        } finally {
            setSavingMeta(false)
        }
    }

    return (
        <Modal
            title={
                <Title level={4} className="!mb-0 font-bold tracking-tight !text-slate-800 dark:!text-slate-100">
                    Edit Task
                </Title>
            }
            open={open}
            onCancel={onCancel}
            footer={null}
            destroyOnClose
            className="dark:!bg-slate-900"
            width={560}
        >
            <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark={false} className="mt-4">
                <Form.Item
                    name="title"
                    label="Judul Task"
                    rules={[{ required: true, message: 'Judul task tidak boleh kosong!' }]}
                >
                    <Input size="large" className="rounded-lg" />
                </Form.Item>

                <Form.Item name="description" label="Deskripsi">
                    <TextArea rows={3} placeholder="Masukkan deskripsi task..." className="rounded-lg" />
                </Form.Item>

                <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                    <Select options={STATUS_OPTIONS} className="w-full" size="large" />
                </Form.Item>

                <div className="mb-4">
                    <TaskMetaEditor items={metaItems} onChange={setMetaItems} />
                </div>

                <div className="flex justify-end gap-2 mt-4 pt-4 !border-t !border-slate-100 dark:!border-slate-800">
                    <Button onClick={onCancel} size="large" className="rounded-lg">
                        Batal
                    </Button>
                    <Button type="primary" htmlType="submit" loading={loading || savingMeta} size="large" className="rounded-lg px-6 font-medium">
                        Simpan
                    </Button>
                </div>
            </Form>
        </Modal>
    )
}