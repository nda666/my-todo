import React from 'react'
import { Modal, Form, Input, Button, Typography } from 'antd'

const { Title } = Typography
const { TextArea } = Input

interface CreateTaskModalProps {
  open: boolean;
  onCancel: () => void;
  onCreate: (values: { title: string; description?: string }) => Promise<void>;
  loading: boolean;
}

export default function CreateTaskModal({ open, onCancel, onCreate, loading }: CreateTaskModalProps) {
  const [form] = Form.useForm()

  const handleFinish = async (values: { title: string; description?: string }) => {
    await onCreate(values)
    form.resetFields()
  }

  return (
    <Modal
      title={
        <Title level={4} className="!mb-0 font-bold tracking-tight text-slate-800 dark:text-slate-100">
          Tambah Task Baru
        </Title>
      }
      open={open}
      onCancel={() => {
        onCancel()
        form.resetFields()
      }}
      footer={null}
      destroyOnClose
      className="dark:bg-slate-900"
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark={false} className="mt-4">
        <Form.Item
          name="title"
          label="Judul Task"
          rules={[{ required: true, message: 'Judul task wajib diisi!' }]}
        >
          <Input placeholder="Masukkan judul tugas..." size="large" className="rounded-lg" />
        </Form.Item>
        <Form.Item name="description" label="Deskripsi">
          <TextArea rows={4} placeholder="Masukkan deskripsi tugas secara detail..." className="rounded-lg" />
        </Form.Item>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button
            onClick={() => {
              onCancel()
              form.resetFields()
            }}
            size="large"
            className="rounded-lg"
          >
            Batal
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            size="large"
            className="rounded-lg px-6 font-medium"
          >
            Tambah
          </Button>
        </div>
      </Form>
    </Modal>
  )
}
