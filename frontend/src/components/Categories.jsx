import React, { useState } from 'react';
import { categoriesAPI } from '../api';
import { Tag, Plus, Trash2, Check } from 'lucide-react';

const PRESET_COLORS = [
  "#6366f1", // Indigo
  "#a855f7", // Purple
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#ec4899", // Pink
  "#06b6d4"  // Cyan
];

export default function Categories({ categories, reloadCategories, addToast }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await categoriesAPI.createCategory(name.trim(), color);
      addToast('Created', `Category "${name}" created successfully.`, 'success');
      setName('');
      await reloadCategories();
    } catch (err) {
      addToast('Error', err.message || 'Failed to create category.', 'warning');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, catName) => {
    if (!window.confirm(`Are you sure you want to delete category "${catName}"? Associated tasks will be set to uncategorized.`)) return;

    try {
      await categoriesAPI.deleteCategory(id);
      addToast('Deleted', `Category "${catName}" removed.`, 'success');
      await reloadCategories();
    } catch (err) {
      addToast('Error', 'Failed to delete category.', 'warning');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '6px' }}>Task Categories</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Define custom groupings (e.g. Work, Personal, urgent topics) with specific color marks.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 2fr',
        gap: '30px',
        alignItems: 'start'
      }}>
        
        {/* Left: Create Category Form */}
        <div className="glass-card">
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Tag size={18} color="var(--primary)" />
            Add New Category
          </h3>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="catName">Category Name</label>
              <input
                id="catName"
                type="text"
                className="form-input"
                placeholder="e.g. Work, Personal, Coding"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {/* Colors Grid Selector */}
            <div className="form-group">
              <label className="form-label">Color Theme</label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '10px',
                marginTop: '4px'
              }}>
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{
                      background: c,
                      border: color === c ? '2px solid #fff' : '2px solid transparent',
                      borderRadius: '8px',
                      height: '36px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      boxShadow: color === c ? `0 0 10px ${c}` : 'none',
                      transition: 'var(--transition)'
                    }}
                  >
                    {color === c && <Check size={14} />}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
              <Plus size={16} /> {loading ? 'Creating...' : 'Create Category'}
            </button>
          </form>
        </div>

        {/* Right: Categories List */}
        <div className="glass-card" style={{ minHeight: '344px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>
            Existing Categories ({categories.length})
          </h3>

          {categories.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '200px',
              color: 'var(--text-secondary)'
            }}>
              <Tag size={36} style={{ marginBottom: '12px', opacity: 0.5 }} />
              <p>No custom categories defined. Tasks will show as Uncategorized.</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '16px'
            }}>
              {categories.map(cat => (
                <div
                  key={cat.id}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderLeft: `5px solid ${cat.color}`,
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <h4 style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>{cat.name}</h4>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Color: {cat.color}</span>
                  </div>

                  <button
                    onClick={() => handleDelete(cat.id, cat.name)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.08)',
                      color: 'var(--danger)',
                      border: 'none',
                      padding: '8px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'var(--transition)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
