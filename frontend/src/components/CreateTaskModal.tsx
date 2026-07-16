import React from 'react';

import {
  Button,
  DatePicker,
  Form,
  Input,
  Modal,
  Typography,
} from 'antd';
import dayjs from 'dayjs';

import { MetaDraft } from '../types/task';
import TaskMetaEditor from './TaskMetaEditor';

const { Title } = Typography
const { TextArea } = Input
const { RangePicker } = DatePicker

interface CreateTaskModalProps {
  open: boolean
  onCancel: () => void
  onCreate: (values: {
    title: string
    description?: string
    meta: MetaDraft[]
    startDate?: string
    dueDate?: string
  }) => Promise<void>
  loading: boolean
}

export default function CreateTaskModal({ open, onCancel, onCreate, loading }: CreateTaskModalProps) {
  const [form] = Form.useForm()
  const [metaItems, setMetaItems] = React.useState<MetaDraft[]>([])

  const handleFinish = async (values: { title: string; description?: string; dateRange?: [dayjs.Dayjs, dayjs.Dayjs] }) => {
    await onCreate({
      title: values.title,
      description: values.description,
      meta: metaItems,
      startDate: values.dateRange?.[0]?.format('YYYY-MM-DD'),
      dueDate: values.dateRange?.[1]?.format('YYYY-MM-DD'),
    })
    form.resetFields()
    setMetaItems([])
  }

  const handleCancel = () => {
    onCancel()
    form.resetFields()
    setMetaItems([])
  }

  return (
    <Modal
      title={<Title level={4} className="!mb-0 font-bold tracking-tight !text-slate-800 dark:!text-slate-100">Tambah Task Baru</Title>}
      open={open}
      onCancel={handleCancel}
      footer={null}
      destroyOnClose
      width={560}
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark={false} className="mt-4">
        <Form.Item name="title" label="Judul Task" rules={[{ required: true, message: 'Judul task wajib diisi!' }]}>
          <Input placeholder="Masukkan judul tugas..." size="large" className="rounded-lg" />
        </Form.Item>
        <Form.Item name="description" label="Deskripsi">
          <TextArea rows={3} placeholder="Masukkan deskripsi tugas secara detail..." className="rounded-lg" />
        </Form.Item>
        <Form.Item name="dateRange" label="Rentang Waktu (opsional)">
          <RangePicker className="w-full" format="DD/MM/YYYY" placeholder={['Mulai', 'Target Selesai']} />
        </Form.Item>

        <div className="mb-4">
          <TaskMetaEditor items={metaItems} onChange={setMetaItems} />
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 !border-t !border-slate-100 dark:!border-slate-800">
          <Button onClick={handleCancel} size="large" className="rounded-lg">Batal</Button>
          <Button type="primary" htmlType="submit" loading={loading} size="large" className="rounded-lg px-6 font-medium">Tambah</Button>
        </div>
      </Form>
    </Modal>
  )
}