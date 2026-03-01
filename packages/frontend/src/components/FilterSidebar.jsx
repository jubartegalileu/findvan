import React, { useState } from 'react'

export default function FilterSidebar({ onFilter }) {
  const [filters, setFilters] = useState({
    city: '',
    company: '',
    status: '',
    search: ''
  })

  const handleChange = (field, value) => {
    const newFilters = { ...filters, [field]: value }
    setFilters(newFilters)
    onFilter(newFilters)
  }

  const handleClear = () => {
    setFilters({ city: '', company: '', status: '', search: '' })
    onFilter({ city: '', company: '', status: '', search: '' })
  }

  return (
    <div style={{ width: '250px', padding: '15px', background: '#f9f9f9', borderRight: '1px solid #ddd', minHeight: '600px' }}>
      <h3 style={{ marginTop: 0 }}>Filters</h3>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px', fontWeight: 'bold' }}>Search</label>
        <input
          type="text"
          placeholder="Name or phone..."
          value={filters.search}
          onChange={(e) => handleChange('search', e.target.value)}
          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px', fontWeight: 'bold' }}>City</label>
        <select
          value={filters.city}
          onChange={(e) => handleChange('city', e.target.value)}
          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }}
        >
          <option value="">All Cities</option>
          <option value="São Paulo">São Paulo</option>
          <option value="Rio de Janeiro">Rio de Janeiro</option>
          <option value="Belo Horizonte">Belo Horizonte</option>
        </select>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px', fontWeight: 'bold' }}>Status</label>
        <select
          value={filters.status}
          onChange={(e) => handleChange('status', e.target.value)}
          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }}
        >
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
        </select>
      </div>

      <button
        onClick={handleClear}
        style={{ width: '100%', padding: '10px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
      >
        Clear Filters
      </button>
    </div>
  )
}
