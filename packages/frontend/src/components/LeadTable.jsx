import React, { useState, useEffect } from 'react'
import leadsClient from '../api/leadsClient'

export default function LeadTable({ filters = {} }) {
  const [leads, setLeads] = useState([])
  const [pagination, setPagination] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedLeads, setSelectedLeads] = useState(new Set())

  useEffect(() => {
    loadLeads()
  }, [filters])

  const loadLeads = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await leadsClient.getLeads(filters)
      setLeads(result.leads || [])
      setPagination({ page: result.page, pages: result.pages, total: result.total })
    } catch (err) {
      setError(err.message)
      setLeads([])
    } finally {
      setLoading(false)
    }
  }

  const handleMarkContacted = async (id) => {
    try {
      await leadsClient.markContacted(id)
      loadLeads()
      alert('Lead marked as contacted!')
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this lead?')) return
    try {
      await leadsClient.deleteLead(id)
      loadLeads()
      alert('Lead deleted!')
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const handleBulkMark = async () => {
    if (selectedLeads.size === 0) {
      alert('Select leads first')
      return
    }
    try {
      await leadsClient.bulkAction(Array.from(selectedLeads), 'mark-contacted')
      setSelectedLeads(new Set())
      loadLeads()
      alert(`Marked ${selectedLeads.size} leads as contacted!`)
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedLeads.size === 0) {
      alert('Select leads first')
      return
    }
    if (!confirm(`Delete ${selectedLeads.size} leads?`)) return
    try {
      await leadsClient.bulkAction(Array.from(selectedLeads), 'delete')
      setSelectedLeads(new Set())
      loadLeads()
      alert(`Deleted ${selectedLeads.size} leads!`)
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const toggleSelect = (id) => {
    const newSelected = new Set(selectedLeads)
    if (newSelected.has(id)) newSelected.delete(id)
    else newSelected.add(id)
    setSelectedLeads(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set())
    } else {
      setSelectedLeads(new Set(leads.map(l => l.id)))
    }
  }

  if (loading) return <div style={{ padding: '20px' }}>Loading leads...</div>
  if (error) return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>
  if (leads.length === 0) return <div style={{ padding: '20px' }}>No leads found</div>

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button onClick={handleBulkMark} style={{ padding: '8px 16px', background: '#4CAF50', color: 'white', border: 'none', cursor: 'pointer' }}>
          ✓ Mark Contacted ({selectedLeads.size})
        </button>
        <button onClick={handleBulkDelete} style={{ padding: '8px 16px', background: '#f44336', color: 'white', border: 'none', cursor: 'pointer' }}>
          🗑 Delete ({selectedLeads.size})
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
        <thead>
          <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
            <th style={{ padding: '12px', textAlign: 'left' }}>
              <input
                type="checkbox"
                checked={selectedLeads.size === leads.length && leads.length > 0}
                onChange={toggleSelectAll}
              />
            </th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Name</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Phone</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Email</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>City</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Company</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
            <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '12px' }}>
                <input
                  type="checkbox"
                  checked={selectedLeads.has(lead.id)}
                  onChange={() => toggleSelect(lead.id)}
                />
              </td>
              <td style={{ padding: '12px' }}>{lead.name}</td>
              <td style={{ padding: '12px' }}>
                <button
                  onClick={() => navigator.clipboard.writeText(lead.phone)}
                  style={{ background: 'none', border: 'none', color: '#2196F3', cursor: 'pointer' }}
                >
                  {lead.phone} 📋
                </button>
              </td>
              <td style={{ padding: '12px' }}>{lead.email || '-'}</td>
              <td style={{ padding: '12px' }}>{lead.city}</td>
              <td style={{ padding: '12px' }}>{lead.company_name}</td>
              <td style={{ padding: '12px' }}>
                {lead.contacted_at ? '✓ Contacted' : '⏳ New'}
              </td>
              <td style={{ padding: '12px', textAlign: 'center' }}>
                {!lead.contacted_at && (
                  <button
                    onClick={() => handleMarkContacted(lead.id)}
                    style={{ padding: '4px 8px', background: '#4CAF50', color: 'white', border: 'none', cursor: 'pointer', marginRight: '5px' }}
                  >
                    ✓
                  </button>
                )}
                <button
                  onClick={() => handleDelete(lead.id)}
                  style={{ padding: '4px 8px', background: '#f44336', color: 'white', border: 'none', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {pagination.pages && (
        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '12px', color: '#666' }}>
          Page {pagination.page} of {pagination.pages} | Total: {pagination.total} leads
        </div>
      )}
    </div>
  )
}
