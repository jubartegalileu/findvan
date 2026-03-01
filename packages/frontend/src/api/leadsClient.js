const API_BASE = import.meta.env.REACT_APP_API_URL || 'http://localhost:3001/api'

const client = {
  getLeads: async (filters = {}) => {
    const { city, company, status, search, page = 1, limit = 20 } = filters
    const params = new URLSearchParams()

    if (city) params.append('city', city)
    if (company) params.append('company', company)
    if (status) params.append('status', status)
    if (search) params.append('search', search)
    params.append('page', page)
    params.append('limit', limit)

    const response = await fetch(`${API_BASE}/leads?${params}`)
    if (!response.ok) throw new Error('Failed to fetch leads')
    return response.json()
  },

  getLead: async (id) => {
    const response = await fetch(`${API_BASE}/leads/${id}`)
    if (!response.ok) throw new Error('Failed to fetch lead')
    return response.json()
  },

  markContacted: async (id) => {
    const response = await fetch(`${API_BASE}/leads/${id}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    if (!response.ok) throw new Error('Failed to mark contacted')
    return response.json()
  },

  updateLead: async (id, data) => {
    const response = await fetch(`${API_BASE}/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Failed to update lead')
    return response.json()
  },

  deleteLead: async (id) => {
    const response = await fetch(`${API_BASE}/leads/${id}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Failed to delete lead')
    return response.json()
  },

  getStats: async () => {
    const response = await fetch(`${API_BASE}/leads/stats`)
    if (!response.ok) throw new Error('Failed to fetch stats')
    return response.json()
  },

  bulkAction: async (ids, action) => {
    const response = await fetch(`${API_BASE}/leads/bulk-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, action })
    })
    if (!response.ok) throw new Error('Bulk action failed')
    return response.json()
  }
}

export default client
