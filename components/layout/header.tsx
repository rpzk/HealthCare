'use client'

import { Bell, Search, Settings, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AIAssistantButton } from '@/components/ai/assistant-button'

export function Header() {
  return (
    <header className="bg-white border-b border-gray-200 fixed w-full top-0 z-50">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-medical-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="text-xl font-bold text-gray-900">
                Sistema Médico
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4 max-w-md flex-1 mx-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar pacientes, consultas..."
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <AIAssistantButton />
            
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-900">Dr. João Silva</p>
                <p className="text-xs text-gray-500">Cardiologista</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
