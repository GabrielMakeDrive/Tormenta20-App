import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header, Button, Modal, Toast, MoneyEditor } from '../../components';
import { getCharacterById, saveCharacter } from '../../services';
import { createInventoryItem, ITEM_TYPES, RARITIES, calculateTotalWeight, calculateTotalValue } from '../../models';
import './Inventory.css';

function Inventory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [character, setCharacter] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState('all');
  
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    quantity: 1,
    weight: 0,
    price: 0,
    type: 'misc',
    rarity: 'common',
  });

  useEffect(() => {
    const loaded = getCharacterById(id);
    if (loaded) {
      setCharacter(loaded);
    } else {
      navigate('/characters');
    }
  }, [id, navigate]);

  const resetForm = () => {
    setNewItem({
      name: '',
      description: '',
      quantity: 1,
      weight: 0,
      price: 0,
      type: 'misc',
      rarity: 'common',
    });
    setEditingItem(null);
  };

  const handleAddItem = () => {
    if (!newItem.name.trim()) {
      setToast({ message: 'Digite o nome do item', type: 'error' });
      return;
    }

    const item = createInventoryItem(newItem);
    const updatedInventory = [...(character.inventory || []), item];
    const updated = { ...character, inventory: updatedInventory };
    
    setCharacter(updated);
    saveCharacter(updated);
    setShowAddModal(false);
    resetForm();
    setToast({ message: 'Item adicionado!', type: 'success' });
  };

  const handleEditItem = () => {
    if (!newItem.name.trim()) {
      setToast({ message: 'Digite o nome do item', type: 'error' });
      return;
    }

    const updatedInventory = character.inventory.map(item =>
      item.id === editingItem.id ? { ...item, ...newItem } : item
    );
    const updated = { ...character, inventory: updatedInventory };
    
    setCharacter(updated);
    saveCharacter(updated);
    setShowAddModal(false);
    resetForm();
    setToast({ message: 'Item atualizado!', type: 'success' });
  };

  const handleDeleteItem = (itemId) => {
    if (window.confirm('Remover este item?')) {
      const updatedInventory = character.inventory.filter(item => item.id !== itemId);
      const updated = { ...character, inventory: updatedInventory };
      
      setCharacter(updated);
      saveCharacter(updated);
      setToast({ message: 'Item removido', type: 'success' });
    }
  };

  const handleQuantityChange = (itemId, delta) => {
    const updatedInventory = character.inventory.map(item => {
      if (item.id === itemId) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0);
    
    const updated = { ...character, inventory: updatedInventory };
    setCharacter(updated);
    saveCharacter(updated);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setNewItem({
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      weight: item.weight,
      price: item.price,
      type: item.type,
      rarity: item.rarity,
    });
    setShowAddModal(true);
  };

  if (!character) {
    return <div className="page">Carregando...</div>;
  }

  const inventory = character.inventory || [];
  const filteredInventory = filter === 'all' 
    ? inventory 
    : inventory.filter(item => item.type === filter);

  const totalWeight = calculateTotalWeight(inventory);
  const totalValue = calculateTotalValue(inventory);

  return (
    <div className="page inventory-page">
      <Header 
        title="Inventário" 
        showBack 
        rightAction={
          <button className="header-btn" onClick={() => { resetForm(); setShowAddModal(true); }}>
            ➕
          </button>
        }
      />
      
      <main className="page-content">
        {/* Summary */}
        <section className="inventory-summary">
          <div className="summary-item">
            <span className="summary-icon">⚖️</span>
            <span className="summary-value">{totalWeight.toFixed(1)} kg</span>
          </div>
          <div className="summary-item">
            <span className="summary-icon">💰</span>
            <MoneyEditor 
              value={character.money} 
              onSave={(newMoney) => {
                const updated = { ...character, money: newMoney };
                setCharacter(updated);
                saveCharacter(updated);
              }}
            />
          </div>
          <div className="summary-item">
            <span className="summary-icon">📦</span>
            <span className="summary-value">{inventory.length} itens</span>
          </div>
        </section>

        {/* Filters */}
        <section className="inventory-filters">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Todos
          </button>
          {ITEM_TYPES.map((type) => (
            <button
              key={type.id}
              className={`filter-btn ${filter === type.id ? 'active' : ''}`}
              onClick={() => setFilter(type.id)}
            >
              {type.icon} {type.name}
            </button>
          ))}
        </section>

        {/* Items List */}
        {filteredInventory.length === 0 ? (
          <div className="empty-inventory">
            <span className="empty-icon">🎒</span>
            <p>Nenhum item {filter !== 'all' ? 'nesta categoria' : ''}</p>
            <Button variant="secondary" onClick={() => { resetForm(); setShowAddModal(true); }}>
              ➕ Adicionar Item
            </Button>
          </div>
        ) : (
          <ul className="inventory-list">
            {filteredInventory.map((item) => {
              const rarity = RARITIES.find(r => r.id === item.rarity);
              const type = ITEM_TYPES.find(t => t.id === item.type);
              
              return (
                <li key={item.id} className="inventory-item">
                  <div className="item-icon">{type?.icon || '📦'}</div>
                  <div className="item-info">
                    <div className="item-header">
                      <span className="item-name" style={{ color: rarity?.color }}>{item.name}</span>
                      <span className="item-qty">x{item.quantity}</span>
                    </div>
                    {item.description && (
                      <p className="item-desc">{item.description}</p>
                    )}
                    <div className="item-meta">
                      {item.weight > 0 && <span>⚖️ {item.weight}kg</span>}
                      {item.price > 0 && <span>💰 T${item.price}</span>}
                    </div>
                  </div>
                  <div className="item-actions">
                    <button onClick={() => handleQuantityChange(item.id, -1)}>−</button>
                    <button onClick={() => handleQuantityChange(item.id, 1)}>+</button>
                    <button onClick={() => openEditModal(item)}>✏️</button>
                    <button className="delete" onClick={() => handleDeleteItem(item.id)}>🗑️</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      {/* Add/Edit Modal */}
      <Modal 
        isOpen={showAddModal} 
        onClose={() => { setShowAddModal(false); resetForm(); }}
        title={editingItem ? 'Editar Item' : 'Adicionar Item'}
      >
        <div className="item-form">
          <div className="form-group">
            <label>Nome</label>
            <input
              type="text"
              placeholder="Nome do item"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Descrição</label>
            <textarea
              placeholder="Descrição (opcional)"
              value={newItem.description}
              onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Quantidade</label>
              <input
                type="number"
                min="1"
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="form-group">
              <label>Peso (kg)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={newItem.weight}
                onChange={(e) => setNewItem({ ...newItem, weight: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="form-group">
              <label>Preço (T$)</label>
              <input
                type="number"
                min="0"
                value={newItem.price}
                onChange={(e) => setNewItem({ ...newItem, price: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Tipo</label>
              <select
                value={newItem.type}
                onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
              >
                {ITEM_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>{type.icon} {type.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Raridade</label>
              <select
                value={newItem.rarity}
                onChange={(e) => setNewItem({ ...newItem, rarity: e.target.value })}
              >
                {RARITIES.map((rarity) => (
                  <option key={rarity.id} value={rarity.id}>{rarity.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-actions">
            <Button variant="secondary" onClick={() => { setShowAddModal(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={editingItem ? handleEditItem : handleAddItem}>
              {editingItem ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </div>
      </Modal>

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
}

export default Inventory;
