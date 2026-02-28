import React, { useState, useEffect } from 'react'
import leadsClient from '../api/leadsClient'

export default function Statistics() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
    const interval = setInterval(loadStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadStats = async () => {
    try {
      const result = await leadsClient.getStats()
      setStats(result.data || result)
    } catch (err) {
      console.error('Error loading stats:', err)
      setStats({ total: 0, contacted: 0, cities: 0, companies: 0 })
    } finally {
      setLoading(false)
    }
  }

  if (loading || !stats) return <div>Loading stats...</div>

  const contactedPercent = ((stats.contacted / stats.total) * 100).toFixed(1)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '20px' }}>
      <div style={{ padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
        <div style={{ fontSize: '12px', color: '#666' }}>Total Leads</div>
        <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.total}</div>
      </div>
      <div style={{ padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
        <div style={{ fontSize: '12px', color: '#666' }}>Contacted</div>
        <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.contacted} ({contactedPercent}%)</div>
      </div>
      <div style={{ padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
        <div style={{ fontSize: '12px', color: '#666' }}>Cities</div>
        <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.cities}</div>
      </div>
      <div style={{ padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
        <div style={{ fontSize: '12px', color: '#666' }}>Companies</div>
        <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.companies}</div>
      </div>
    </div>
  )
}
