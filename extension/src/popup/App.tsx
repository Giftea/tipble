import React, { useState } from 'react'
import Dashboard from './tabs/Dashboard'
import Rules from './tabs/Rules'
import History from './tabs/History'
import Settings from './tabs/Settings'

type Tab = 'dashboard' | 'rules' | 'history' | 'settings'

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'rules', label: 'Rules' },
  { id: 'history', label: 'History' },
  { id: 'settings', label: 'Settings' }
]

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  return (
    <div style={{ width: 380, minHeight: 500, background: '#0a0a0a', color: 'white', fontFamily: '-apple-system, sans-serif', overflow: 'hidden' }}>
      <nav style={{ display: 'flex', borderBottom: '1px solid #1a1a1a', position: 'sticky', top: 0, background: '#0a0a0a', zIndex: 10 }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '10px 0',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #5dcaa5' : '2px solid transparent',
              color: activeTab === tab.id ? '#5dcaa5' : '#555',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: activeTab === tab.id ? 600 : 400,
              transition: 'color 0.15s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div style={{ padding: 12, maxHeight: 540, overflowY: 'auto' }}>
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'rules' && <Rules />}
        {activeTab === 'history' && <History />}
        {activeTab === 'settings' && <Settings />}
      </div>
    </div>
  )
}
