"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { DollarSign, TrendingUp, TrendingDown, Plus, CreditCard } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from '@/hooks/use-toast'
import { PaymentDialog } from './payment-dialog'
import { logger } from '@/lib/logger'

export function FinancialDashboard() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null)
  const [newTransaction, setNewTransaction] = useState({
    type: 'INCOME',
    amount: '',
    description: '',
    category: '',
    dueDate: format(new Date(), 'yyyy-MM-dd')
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const res = await fetch('/api/financial')
      const json = await res.json()
      setData(json)
    } catch (error) {
      logger.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTransaction = async () => {
    try {
      const res = await fetch('/api/financial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTransaction)
      })
      
      if (!res.ok) throw new Error('Failed to create')
      
      toast({ title: 'Sucesso', description: 'Transação registrada.' })
      setIsAddModalOpen(false)
      fetchData()
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao registrar transação.', variant: 'destructive' })
    }
  }

  if (loading) return <div className="p-8 text-center">Carregando financeiro...</div>

  const chartData = [
    { name: 'Receitas', value: data?.balance?.income || 0 },
    { name: 'Despesas', value: data?.balance?.expense || 0 }
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Financeiro</h2>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Nova Transação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Transação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select 
                    value={newTransaction.type} 
                    onValueChange={(v) => setNewTransaction({...newTransaction, type: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INCOME">Receita</SelectItem>
                      <SelectItem value="EXPENSE">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input 
                    type="number" 
                    value={newTransaction.amount}
                    onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input 
                  value={newTransaction.description}
                  onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Input 
                  value={newTransaction.category}
                  onChange={(e) => setNewTransaction({...newTransaction, category: e.target.value})}
                  placeholder="Ex: Consulta, Aluguel..."
                />
              </div>
              <div className="space-y-2">
                <Label>Data de Vencimento</Label>
                <Input 
                  type="date"
                  value={newTransaction.dueDate}
                  onChange={(e) => setNewTransaction({...newTransaction, dueDate: e.target.value})}
                />
              </div>
              <Button className="w-full" onClick={handleAddTransaction}>Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data?.balance?.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              R$ {data?.balance?.balance?.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas (Mês)</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {data?.balance?.income?.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas (Mês)</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              R$ {data?.balance?.expense?.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Fluxo de Caixa</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
                  <Bar dataKey="value" fill="#40e0d0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Últimas Transações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {data?.transactions?.slice(0, 5).map((t: any) => (
                <div key={t.id} className="flex items-center">
                  <div className={`ml-4 space-y-1 flex-1 ${t.type === 'INCOME' ? 'border-l-4 border-green-500 pl-2' : 'border-l-4 border-red-500 pl-2'}`}>
                    <p className="text-sm font-medium leading-none">{t.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(t.dueDate), 'dd/MM/yyyy')} • {t.category}
                      {t.status === 'PENDING' && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Pendente
                        </Badge>
                      )}
                      {t.status === 'PAID' && (
                        <Badge variant="default" className="ml-2 text-xs bg-green-600">
                          Pago
                        </Badge>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`font-medium ${t.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.type === 'INCOME' ? '+' : '-'} R$ {Number(t.amount).toFixed(2)}
                    </div>
                    {t.type === 'INCOME' && t.status === 'PENDING' && (
                      <Button
                        onClick={() => setSelectedTransaction(t)}
                        size="sm"
                        variant="outline"
                        className="ml-2"
                      >
                        <CreditCard className="h-4 w-4 mr-1" />
                        Cobrar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Pagamento */}
      {selectedTransaction && (
        <PaymentDialog
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          onSuccess={() => {
            fetchData()
            setSelectedTransaction(null)
          }}
        />
      )}
    </div>
  )
}
