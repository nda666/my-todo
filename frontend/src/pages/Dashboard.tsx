import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Layout,
  Card,
  Button,
  Input,
  Form,
  Select,
  Tag,
  Space,
  List,
  Typography,
  Divider,
  Popconfirm,
  message,
  Avatar,
  Badge,
  Empty,
  Spin,
  Modal,
  Menu,
} from 'antd'
import {
  LogoutOutlined,
  PlusOutlined,
  DeleteOutlined,
  CommentOutlined,
  TagOutlined,
  UserOutlined,
  SendOutlined,
  FieldTimeOutlined,
  EditOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons'
import {
  GET_TASKS,
  CREATE_TASK,
  UPDATE_TASK,
  DELETE_TASK,
  ADD_COMMENT,
  SET_META,
} from '../lib/queries'
import { graphql } from '../lib/auth'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import ThemeSelector from '../components/ThemeSelector'

const { Sider, Header, Content } = Layout
const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending', color: 'warning' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'processing' },
  { value: 'COMPLETED', label: 'Completed', color: 'success' },
]

function TaskCard({ task, onUpdate, onDelete, onAddComment, onSetMeta }) {
  const [expanded, setExpanded] = useState(false)
  const [commentContent, setCommentContent] = useState('')
  const [metaKey, setMetaKey] = useState('')
  const [metaValue, setMetaValue] = useState('')
  const [addingComment, setAddingComment] = useState(false)
  const [addingMeta, setAddingMeta] = useState(false)

  // Edit states
  const [isEditing, setIsEditing] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [editForm] = Form.useForm()

  const activeStatus = STATUS_OPTIONS.find((s) => s.value === task.status)

  const handleCommentSubmit = async (e) => {
    e.preventDefault()
    if (!commentContent.trim()) return
    setAddingComment(true)
    try {
      await onAddComment(task.id, commentContent.trim())
      setCommentContent('')
      message.success('Komentar berhasil ditambahkan')
    } catch (err) {
      message.error(err.message || 'Gagal menambahkan komentar')
    } finally {
      setAddingComment(false)
    }
  }

  const handleMetaSubmit = async (e) => {
    e.preventDefault()
    if (!metaKey.trim()) return
    setAddingMeta(true)
    try {
      await onSetMeta(task.id, metaKey.trim(), metaValue.trim() || null)
      setMetaKey('')
      setMetaValue('')
      message.success('Meta berhasil disimpan')
    } catch (err) {
      message.error(err.message || 'Gagal menyimpan meta')
    } finally {
      setAddingMeta(false)
    }
  }

  const startEditing = () => {
    editForm.setFieldsValue({
      title: task.title,
      description: task.description,
      status: task.status,
    })
    setIsEditing(true)
  }

  const handleEditSubmit = async (values) => {
    setUpdating(true)
    try {
      await onUpdate(task.id, {
        title: values.title.trim(),
        description: values.description?.trim() || null,
        status: values.status,
      })
      setIsEditing(false)
    } catch (err) {
      message.error(err.message || 'Gagal memperbarui task')
    } finally {
      setUpdating(false)
    }
  }

  if (isEditing) {
    return (
      <Card
        className="shadow-sm border border-blue-400 dark:border-blue-800 bg-white dark:bg-slate-900 rounded-xl mb-4"
        bodyStyle={{ padding: '1.5rem' }}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditSubmit}
          requiredMark={false}
        >
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

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button onClick={() => setIsEditing(false)} size="large" className="rounded-lg">
              Batal
            </Button>
            <Button type="primary" htmlType="submit" loading={updating} size="large" className="rounded-lg px-6 font-medium">
              Simpan
            </Button>
          </div>
        </Form>
      </Card>
    )
  }

  return (
    <Card
      className="shadow-sm hover:shadow-md transition-shadow duration-200 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl overflow-hidden mb-4"
      bodyStyle={{ padding: '1.5rem' }}
    >
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <Title level={4} className="!mb-0 font-semibold text-slate-800 dark:text-slate-100">
              {task.title}
            </Title>
            <Tag color={activeStatus?.color || 'default'} className="font-medium rounded-full px-2.5">
              {activeStatus?.label || task.status}
            </Tag>
          </div>
          {task.description ? (
            <Paragraph className="text-slate-600 dark:text-slate-400 mb-0 max-w-2xl whitespace-pre-wrap font-light">
              {task.description}
            </Paragraph>
          ) : (
            <Text type="secondary" italic className="text-slate-400 dark:text-slate-500 text-sm">
              Tidak ada deskripsi.
            </Text>
          )}

          <div className="flex items-center gap-2 mt-4 text-xs text-slate-400 dark:text-slate-500">
            <FieldTimeOutlined />
            <span>Dibuat: {new Date(task.createdAt).toLocaleString('id-ID')}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap md:flex-nowrap border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 dark:border-slate-800">
          <Select
            value={task.status}
            onChange={(val) => onUpdate(task.id, { status: val })}
            options={STATUS_OPTIONS}
            className="w-36"
            popupClassName="dark:bg-slate-900"
          />

          <Button
            type="default"
            onClick={startEditing}
            icon={<EditOutlined />}
          >
            Edit
          </Button>

          <Button
            type="dashed"
            onClick={() => setExpanded(!expanded)}
            icon={<CommentOutlined />}
          >
            {expanded ? 'Tutup Detail' : `Detail (${(task.comments?.length || 0) + (task.meta?.length || 0)})`}
          </Button>

          <Popconfirm
            title="Hapus Task"
            description="Apakah Anda yakin ingin menghapus task ini?"
            onConfirm={() => onDelete(task.id)}
            okText="Ya"
            cancelText="Tidak"
            okButtonProps={{ danger: true }}
          >
            <Button type="primary" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      </div>

      {expanded && (
        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 animate-fadeIn">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Meta Section */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-3">
                <TagOutlined className="text-slate-500" />
                <Title level={5} className="!mb-0 font-medium text-slate-800 dark:text-slate-200">
                  Metadata
                </Title>
              </div>

              {task.meta?.length > 0 ? (
                <List
                  size="small"
                  dataSource={task.meta}
                  className="mb-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800"
                  renderItem={(m) => (
                    <List.Item className="px-3 py-2 flex justify-between items-center text-sm">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <Tag className="m-0 font-mono text-xs max-w-[120px] truncate" color="blue">
                          {m.key}
                        </Tag>
                        <span className="text-slate-400 font-light">:</span>
                        <span className="text-slate-700 dark:text-slate-300 truncate">{m.value || '-'}</span>
                      </div>
                    </List.Item>
                  )}
                />
              ) : (
                <Text type="secondary" className="block text-center py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg mb-4 text-xs italic">
                  Belum ada metadata.
                </Text>
              )}

              <form onSubmit={handleMetaSubmit} className="flex gap-2">
                <Input
                  placeholder="Key"
                  value={metaKey}
                  onChange={(e) => setMetaKey(e.target.value)}
                  className="w-1/3"
                  required
                />
                <Input
                  placeholder="Value"
                  value={metaValue}
                  onChange={(e) => setMetaValue(e.target.value)}
                  className="flex-1"
                />
                <Button type="primary" htmlType="submit" loading={addingMeta} icon={<PlusOutlined />} />
              </form>
            </div>

            {/* Comments Section */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-3">
                <CommentOutlined className="text-slate-500" />
                <Title level={5} className="!mb-0 font-medium text-slate-800 dark:text-slate-200">
                  Komentar ({task.comments?.length || 0})
                </Title>
              </div>

              {task.comments?.length > 0 ? (
                <div className="max-h-48 overflow-y-auto mb-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-2 flex flex-col gap-2">
                  {task.comments.map((c) => (
                    <div key={c.id} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <Space size="small">
                          <Avatar size={16} icon={<UserOutlined />} className="bg-blue-500" />
                          <span className="font-semibold text-xs text-blue-600 dark:text-blue-400">{c.userKode}</span>
                        </Space>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {new Date(c.createdAt).toLocaleDateString('id-ID')} {new Date(c.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 m-0 leading-relaxed font-light">{c.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <Text type="secondary" className="block text-center py-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg mb-4 text-xs italic">
                  Belum ada komentar.
                </Text>
              )}

              <form onSubmit={handleCommentSubmit} className="flex gap-2">
                <Input
                  placeholder="Tulis komentar..."
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  className="flex-1"
                  required
                />
                <Button type="primary" htmlType="submit" loading={addingComment} icon={<SendOutlined />} />
              </form>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

export default function Dashboard() {
  const { me, logout } = useAuth()
  const { resolvedTheme } = useTheme()
  const navigate = useNavigate()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [form] = Form.useForm()

  const loadTasks = useCallback(async () => {
    setLoading(true)
    try {
      const data = await graphql(GET_TASKS)
      setTasks(data.tasks || [])
    } catch (err) {
      message.error(err.message || 'Gagal memuat task')
      logout()
      navigate('/login')
    } finally {
      setLoading(false)
    }
  }, [navigate, logout])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const handleLogout = () => {
    logout()
    message.info('Anda telah keluar')
    navigate('/login')
  }

  const handleCreate = async (values) => {
    if (!values.title.trim()) return
    setCreating(true)
    try {
      await graphql(CREATE_TASK, {
        input: {
          title: values.title.trim(),
          description: values.description?.trim() || null,
        },
      })
      form.resetFields()
      setIsCreateModalOpen(false)
      message.success('Task baru berhasil ditambahkan!')
      loadTasks()
    } catch (err) {
      message.error(err.message || 'Gagal menambahkan task')
    } finally {
      setCreating(false)
    }
  }

  const handleUpdate = async (id, input) => {
    try {
      await graphql(UPDATE_TASK, { id, input })
      loadTasks()
    } catch (err) {
      message.error(err.message || 'Gagal memperbarui status')
    }
  }

  const handleDelete = async (id) => {
    try {
      await graphql(DELETE_TASK, { id })
      message.success('Task berhasil dihapus')
      loadTasks()
    } catch (err) {
      message.error(err.message || 'Gagal menghapus task')
    }
  }

  const handleAddComment = async (taskId, content) => {
    await graphql(ADD_COMMENT, { taskId, content })
    loadTasks()
  }

  const handleSetMeta = async (taskId, key, value) => {
    await graphql(SET_META, { taskId, key, value: value || null })
    loadTasks()
  }

  // Calculate task statistics for the sidebar
  const totalTasks = tasks.length
  const pendingTasks = tasks.filter((t) => t.status === 'PENDING').length
  const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS').length
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length

  return (
    <Layout className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      {/* Sidebar on the Left */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        breakpoint="lg"
        collapsedWidth="0"
        width={280}
        className="bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 sticky top-0 h-screen z-50 flex flex-col"
      >
        <div className="flex flex-col h-full justify-between p-4">
          <div className="flex flex-col gap-6">
            {/* Header Brand */}
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="bg-blue-600 text-white rounded-lg px-2.5 py-1.5 flex items-center justify-center font-bold text-lg shadow-sm">
                DT
              </div>
              {!collapsed && (
                <div>
                  <Title level={4} className="!mb-0 font-bold tracking-tight text-slate-800 dark:text-slate-100">
                    Doran Todo
                  </Title>
                  <Text type="secondary" className="text-xs">
                    Workspace Anda
                  </Text>
                </div>
              )}
            </div>

            {/* Profile Section */}
            {!collapsed && (
              <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 p-3.5 rounded-xl flex items-center gap-3">
                <Avatar size="large" className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-200 shrink-0" icon={<UserOutlined />} />
                <div className="overflow-hidden leading-tight text-left">
                  <div className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">
                    {me?.pegawai?.nama || me?.username || 'User'}
                  </div>
                  {me?.pegawai ? (
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      {me.pegawai.jabatan?.nama || 'Pegawai'} • {me.pegawai.divisi?.nama || 'Divisi'}
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Online</div>
                  )}
                </div>
              </div>
            )}

            {/* Add Task Button */}
            {!collapsed && (
              <Button
                type="primary"
                size="large"
                icon={<PlusOutlined />}
                onClick={() => setIsCreateModalOpen(true)}
                className="w-full rounded-xl font-medium shadow-sm"
              >
                Task Baru
              </Button>
            )}

            {/* Statistics */}
            {!collapsed && (
              <div className="flex flex-col gap-2">
                <Divider className="my-1 border-slate-100 dark:border-slate-800" />
                <div className="px-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Statistik Tugas
                </div>
                <div className="flex flex-col gap-1.5 mt-2">
                  <div className="flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/50 rounded-lg text-sm">
                    <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <TagOutlined className="text-slate-400" /> Total
                    </span>
                    <Badge count={totalTasks} color="#3b82f6" className="font-semibold" />
                  </div>
                  <div className="flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/50 rounded-lg text-sm">
                    <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <ClockCircleOutlined className="text-amber-500" /> Pending
                    </span>
                    <Badge count={pendingTasks} color="#f59e0b" className="font-semibold" />
                  </div>
                  <div className="flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/50 rounded-lg text-sm">
                    <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <PlayCircleOutlined className="text-blue-500" /> In Progress
                    </span>
                    <Badge count={inProgressTasks} color="#10b981" className="font-semibold" />
                  </div>
                  <div className="flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/50 rounded-lg text-sm">
                    <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <CheckCircleOutlined className="text-emerald-500" /> Completed
                    </span>
                    <Badge count={completedTasks} color="#10b981" className="font-semibold" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Footer Controls */}
          {!collapsed && (
            <div className="flex flex-col gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-center">
                <ThemeSelector size="small" />
              </div>
              <Button
                type="text"
                danger
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                className="w-full text-left rounded-lg font-medium py-2 flex items-center justify-center gap-2 border border-dashed border-red-200 dark:border-red-950/40 hover:bg-red-50 dark:hover:bg-red-950/10"
              >
                Keluar Akun
              </Button>
            </div>
          )}
        </div>
      </Sider>

      {/* Right Content Area */}
      <Layout>
        {/* Top Header navbar */}
        <Header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between h-16 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="text-lg w-10 h-10 flex items-center justify-center bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg"
            />
            <Title level={4} className="!mb-0 font-bold tracking-tight text-slate-800 dark:text-slate-100">
              Daftar Tugas Anda
            </Title>
          </div>

          <div className="flex items-center gap-3">
            {collapsed && <ThemeSelector size="small" />}
            {collapsed && (
              <Button
                type="primary"
                danger
                shape="circle"
                icon={<LogoutOutlined />}
                onClick={handleLogout}
              />
            )}
          </div>
        </Header>

        {/* Inner Content Grid */}
        <Content className="max-w-4xl w-full mx-auto p-6">
          <div className="flex items-center justify-between mb-6 px-1">
            <div>
              <Title level={5} className="!mb-0 font-semibold text-slate-800 dark:text-slate-200">
                Semua Tugas <Badge count={tasks.length} showZero color="#3b82f6" className="ms-2" />
              </Title>
              <Text type="secondary" className="text-xs">
                Perbarui status tugas atau edit rincian tugas secara langsung
              </Text>
            </div>
            {/* Show Add Task button on mobile or when sidebar is collapsed */}
            {(collapsed || window.innerWidth < 992) && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsCreateModalOpen(true)}
                className="rounded-lg"
              >
                Task Baru
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col justify-center items-center py-20 gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
              <Spin size="large" />
              <Text type="secondary">Memuat daftar tugas...</Text>
            </div>
          ) : tasks.length === 0 ? (
            <Card className="border border-dashed border-slate-300 dark:border-slate-850 rounded-xl bg-white dark:bg-slate-900 text-center py-16 shadow-sm">
              <Empty
                description={
                  <span className="text-slate-500 dark:text-slate-400 font-light">
                    Belum ada task. Klik tombol <strong>Task Baru</strong> untuk memulainya!
                  </span>
                }
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </Card>
          ) : (
            <div className="animate-fadeIn">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  onAddComment={handleAddComment}
                  onSetMeta={handleSetMeta}
                />
              ))}
            </div>
          )}
        </Content>
      </Layout>

      {/* Create Task Modal */}
      <Modal
        title={
          <Title level={4} className="!mb-0 font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Tambah Task Baru
          </Title>
        }
        open={isCreateModalOpen}
        onCancel={() => {
          setIsCreateModalOpen(false)
          form.resetFields()
        }}
        footer={null}
        destroyOnClose
        className="dark:bg-slate-900"
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} requiredMark={false} className="mt-4">
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
                setIsCreateModalOpen(false)
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
              loading={creating}
              size="large"
              className="rounded-lg px-6 font-medium"
            >
              Tambah
            </Button>
          </div>
        </Form>
      </Modal>
    </Layout>
  )
}
