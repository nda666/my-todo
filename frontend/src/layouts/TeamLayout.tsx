import React from 'react';

import {
    Button,
    Drawer,
    Layout,
    Typography,
} from 'antd';
import { useNavigate } from 'react-router-dom';

import {
    ArrowLeftOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
} from '@ant-design/icons';

import TeamsPageSidebar from '../components/TeamsPageSidebar';
import ThemeSelector from '../components/ThemeSelector';
import { useAuth } from '../contexts/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { useLocalStorageState } from '../hooks/useLocalStorageState';

const { Header, Content } = Layout
const { Title } = Typography

const SIDEBAR_WIDTH = 260

interface TeamLayoutProps {
    title: string
    onBack?: () => void
    headerExtra?: React.ReactNode
    wide?: boolean
    storageKey?: string
    defaultCollapsed?: boolean
    children: React.ReactNode
}

export default function TeamLayout({
    title,
    onBack,
    headerExtra,
    wide = false,
    storageKey = 'team_sidebar_collapsed',
    defaultCollapsed = false,
    children,
}: TeamLayoutProps) {
    const { me, logout } = useAuth()
    const navigate = useNavigate()
    const isMobile = useIsMobile()
    const [collapsed, setCollapsed] = useLocalStorageState<boolean>(storageKey, defaultCollapsed)
    const [mobileOpen, setMobileOpen] = React.useState(false)

    const currentDivisiKode = me?.pegawai?.divisi?.kode || null

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    const toggleSidebar = () => {
        if (isMobile) {
            setMobileOpen((v) => !v)
        } else {
            setCollapsed(!collapsed)
        }
    }

    return (
        <Layout className="!min-h-screen !bg-slate-50 dark:!bg-slate-950">
            {!isMobile && (
                <div
                    className="fixed top-0 left-0 h-screen z-50 transition-all duration-200"
                    style={{ width: collapsed ? 0 : SIDEBAR_WIDTH }}
                >
                    <TeamsPageSidebar
                        me={me}
                        collapsed={collapsed}
                        currentDivisiKode={currentDivisiKode}
                        onLogout={handleLogout}
                    />
                </div>
            )}

            {isMobile && (
                <Drawer
                    placement="left"
                    open={mobileOpen}
                    onClose={() => setMobileOpen(false)}
                    width={SIDEBAR_WIDTH}
                    closable={false}
                    bodyStyle={{ padding: 0 }}
                >
                    <TeamsPageSidebar
                        me={me}
                        collapsed={false}
                        currentDivisiKode={currentDivisiKode}
                        onLogout={handleLogout}
                    />
                </Drawer>
            )}

            <Layout
                className="transition-all duration-200"
                style={{ marginLeft: !isMobile && !collapsed ? SIDEBAR_WIDTH : 0 }}
            >
                <Header className="!bg-white dark:!bg-slate-900 !border-b !border-slate-200 dark:!border-slate-800 px-3 sm:px-6 flex items-center justify-between h-16 sticky top-0 z-40">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <Button
                            type="text"
                            icon={collapsed || isMobile ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                            onClick={toggleSidebar}
                            className="text-lg w-10 h-10 flex items-center justify-center !bg-slate-50 dark:!bg-slate-950 !border !border-slate-100 dark:!border-slate-800 rounded-lg shrink-0"
                        />
                        {onBack && <Button type="text" icon={<ArrowLeftOutlined />} onClick={onBack} className="shrink-0" />}
                        <Title level={4} className="!mb-0 font-bold tracking-tight !text-slate-800 dark:!text-slate-100 truncate">
                            {title}
                        </Title>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        {headerExtra}
                        <ThemeSelector size="small" />
                    </div>
                </Header>

                <Content className={wide ? 'p-3 sm:p-6 flex flex-col' : 'flex flex-col max-w-5xl w-full mx-auto p-3 sm:p-6'}>
                    {children}
                </Content>
            </Layout>
        </Layout>
    )
}