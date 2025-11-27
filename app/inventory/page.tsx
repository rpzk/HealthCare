'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  Package, 
  Warehouse, 
  TrendingDown, 
  AlertTriangle,
  Plus,
  Search,
  Filter,
  RefreshCw,
  ArrowUpCircle,
  ArrowDownCircle,
  Calendar
} from 'lucide-react'

interface DashboardData {
  summary: {
    totalProducts: number
    activeProducts: number
    lowStockCount: number
    expiringCount: number
    totalLocations: number
    movementsThisMonth: number
  }
  lowStockItems: { id: string; code: string; name: string; minStock: number; currentStock: number }[]
  expiringItems: { id: string; product: { code: string; name: string }; location: { name: string }; quantity: number; expirationDate: string; lotNumber?: string }[]
  recentMovements: { id: string; type: string; typeLabel: string; quantity: number; product: { code: string; name: string }; createdAt: string }[]
}

interface Product {
  id: string
  code: string
  name: string
  description?: string
  unit: string
  minStock: number
  totalStock: number
  availableStock: number
  isLowStock: boolean
  isActive: boolean
  category?: { id: string; name: string }
}

const unitLabels: Record<string, string> = {
  UNIT: 'Un',
  BOX: 'Cx',
  PACK: 'Pct',
  BOTTLE: 'Fr',
  AMPULE: 'Amp',
  TUBE: 'Tb',
  BAG: 'Bolsa',
  KIT: 'Kit',
  LITER: 'L',
  ML: 'mL',
  GRAM: 'g',
  KG: 'kg',
  METER: 'm',
  CM: 'cm',
  ROLL: 'Rolo',
  PAIR: 'Par'
}

export default function InventoryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'movements'>('dashboard')
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showLowStock, setShowLowStock] = useState(false)
  const [showNewProductModal, setShowNewProductModal] = useState(false)
  const [showMovementModal, setShowMovementModal] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    
    loadData()
  }, [session, status, activeTab])

  const loadData = async () => {
    setLoading(true)
    setError('')
    
    try {
      if (activeTab === 'dashboard') {
        const res = await fetch('/api/inventory/dashboard')
        if (!res.ok) throw new Error('Erro ao carregar dashboard')
        const data = await res.json()
        setDashboard(data)
      } else if (activeTab === 'products') {
        const params = new URLSearchParams()
        if (searchTerm) params.set('search', searchTerm)
        if (showLowStock) params.set('lowStock', 'true')
        
        const res = await fetch(`/api/inventory/products?${params}`)
        if (!res.ok) throw new Error('Erro ao carregar produtos')
        const data = await res.json()
        setProducts(data.data || [])
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'products') {
      const debounce = setTimeout(loadData, 300)
      return () => clearTimeout(debounce)
    }
  }, [searchTerm, showLowStock])

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestão de Estoque</h1>
            <p className="text-gray-600">Controle de materiais e insumos</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowMovementModal(true)}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              <ArrowUpCircle className="h-5 w-5" />
              Movimentar
            </button>
            <button
              onClick={() => setShowNewProductModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-5 w-5" />
              Novo Produto
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`pb-4 px-2 font-medium transition-colors ${
                activeTab === 'dashboard'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`pb-4 px-2 font-medium transition-colors ${
                activeTab === 'products'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Produtos
            </button>
            <button
              onClick={() => setActiveTab('movements')}
              className={`pb-4 px-2 font-medium transition-colors ${
                activeTab === 'movements'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Movimentações
            </button>
          </nav>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && dashboard && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Package className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Produtos Ativos</p>
                    <p className="text-2xl font-bold">{dashboard.summary.activeProducts}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <div className="flex items-center gap-4">
                  <div className="bg-yellow-100 p-3 rounded-lg">
                    <TrendingDown className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Estoque Baixo</p>
                    <p className="text-2xl font-bold">{dashboard.summary.lowStockCount}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <div className="flex items-center gap-4">
                  <div className="bg-red-100 p-3 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Vencendo (30 dias)</p>
                    <p className="text-2xl font-bold">{dashboard.summary.expiringCount}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Warehouse className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Localizações</p>
                    <p className="text-2xl font-bold">{dashboard.summary.totalLocations}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Two column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Low Stock Alert */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-yellow-600" />
                  <h3 className="font-semibold">Produtos com Estoque Baixo</h3>
                </div>
                <div className="p-4">
                  {dashboard.lowStockItems.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Nenhum produto com estoque baixo</p>
                  ) : (
                    <div className="space-y-3">
                      {dashboard.lowStockItems.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-gray-500">{item.code}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-yellow-700">{item.currentStock}</p>
                            <p className="text-xs text-gray-500">Mín: {item.minStock}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Expiring Items */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-red-600" />
                  <h3 className="font-semibold">Itens Vencendo em 30 dias</h3>
                </div>
                <div className="p-4">
                  {dashboard.expiringItems.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Nenhum item próximo do vencimento</p>
                  ) : (
                    <div className="space-y-3">
                      {dashboard.expiringItems.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                          <div>
                            <p className="font-medium">{item.product.name}</p>
                            <p className="text-sm text-gray-500">
                              {item.location.name} {item.lotNumber && `• Lote: ${item.lotNumber}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-red-700 font-medium">
                              {new Date(item.expirationDate).toLocaleDateString('pt-BR')}
                            </p>
                            <p className="text-xs text-gray-500">Qtd: {item.quantity}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Movements */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b">
                <h3 className="font-semibold">Movimentações Recentes</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Data</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Produto</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Tipo</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Qtd</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {dashboard.recentMovements.map((mov: any) => (
                      <tr key={mov.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">
                          {new Date(mov.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{mov.product.name}</p>
                          <p className="text-sm text-gray-500">{mov.product.code}</p>
                        </td>
                        <td className="px-4 py-3 text-sm">{mov.typeLabel}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-medium ${
                            ['ENTRY', 'ADJUSTMENT_IN', 'TRANSFER_IN', 'RETURN'].includes(mov.type)
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            {['ENTRY', 'ADJUSTMENT_IN', 'TRANSFER_IN', 'RETURN'].includes(mov.type) ? '+' : '-'}
                            {mov.quantity}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome, código ou código de barras..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showLowStock}
                  onChange={(e) => setShowLowStock(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Apenas estoque baixo</span>
              </label>
              <button
                onClick={loadData}
                className="p-2 text-gray-500 hover:text-gray-700"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Código</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Nome</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Categoria</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Un</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Estoque</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Mínimo</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        Nenhum produto encontrado
                      </td>
                    </tr>
                  ) : (
                    products.map(product => (
                      <tr key={product.id} className="hover:bg-gray-50 cursor-pointer">
                        <td className="px-4 py-3 text-sm font-mono">{product.code}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{product.name}</p>
                          {product.description && (
                            <p className="text-sm text-gray-500 truncate max-w-xs">{product.description}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">{product.category?.name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-center">{unitLabels[product.unit] || product.unit}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-medium ${product.isLowStock ? 'text-red-600' : ''}`}>
                            {product.totalStock}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-500">{product.minStock}</td>
                        <td className="px-4 py-3 text-center">
                          {product.isLowStock ? (
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                              Baixo
                            </span>
                          ) : product.isActive ? (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                              OK
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                              Inativo
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Movements Tab */}
        {activeTab === 'movements' && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <p className="text-gray-500 text-center py-8">
              Histórico completo de movimentações disponível via API.
              <br />
              <code className="text-sm bg-gray-100 px-2 py-1 rounded mt-2 inline-block">
                GET /api/inventory/movements
              </code>
            </p>
          </div>
        )}

        {/* New Product Modal */}
        {showNewProductModal && (
          <NewProductModal 
            onClose={() => setShowNewProductModal(false)} 
            onSuccess={() => {
              setShowNewProductModal(false)
              loadData()
            }}
          />
        )}

        {/* Movement Modal */}
        {showMovementModal && (
          <MovementModal 
            onClose={() => setShowMovementModal(false)} 
            onSuccess={() => {
              setShowMovementModal(false)
              loadData()
            }}
          />
        )}
      </div>
    </div>
  )
}

// New Product Modal
function NewProductModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    unit: 'UNIT',
    minStock: 0
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/inventory/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao criar produto')
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Novo Produto</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código *
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unidade
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                {Object.entries(unitLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label} - {value}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estoque Mínimo
            </label>
            <input
              type="number"
              value={formData.minStock}
              onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
              className="w-full border rounded-lg px-3 py-2"
              min="0"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar Produto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Movement Modal
function MovementModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    productId: '',
    type: 'ENTRY',
    quantity: 1,
    toLocationId: '',
    fromLocationId: '',
    notes: ''
  })
  const [products, setProducts] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Load products and locations
    Promise.all([
      fetch('/api/inventory/products?limit=100').then(r => r.json()),
      fetch('/api/inventory/locations').then(r => r.json())
    ]).then(([prodRes, locRes]) => {
      setProducts(prodRes.data || [])
      setLocations(locRes || [])
    })
  }, [])

  const isEntry = ['ENTRY', 'ADJUSTMENT_IN', 'TRANSFER_IN', 'RETURN'].includes(formData.type)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/inventory/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao criar movimentação')
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Nova Movimentação</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Produto *
            </label>
            <select
              value={formData.productId}
              onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              required
            >
              <option value="">Selecione...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="ENTRY">Entrada</option>
                <option value="EXIT">Saída</option>
                <option value="ADJUSTMENT_IN">Ajuste +</option>
                <option value="ADJUSTMENT_OUT">Ajuste -</option>
                <option value="CONSUMPTION">Consumo</option>
                <option value="LOSS">Perda</option>
                <option value="RETURN">Devolução</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantidade *
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                className="w-full border rounded-lg px-3 py-2"
                min="1"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isEntry ? 'Localização Destino *' : 'Localização Origem *'}
            </label>
            <select
              value={isEntry ? formData.toLocationId : formData.fromLocationId}
              onChange={(e) => setFormData({ 
                ...formData, 
                [isEntry ? 'toLocationId' : 'fromLocationId']: e.target.value 
              })}
              className="w-full border rounded-lg px-3 py-2"
              required
            >
              <option value="">Selecione...</option>
              {locations.map((l: any) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observações
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Registrando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
