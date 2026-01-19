"use client"

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface MetricCardProps {
  title: string
  value: string | number
  description?: string
  trend?: string
  icon?: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'destructive'
}

export function MetricCard({ 
  title, 
  value, 
  description, 
  trend, 
  icon, 
  variant = 'default' 
}: MetricCardProps) {
  const getTrendColor = (trend?: string) => {
    if (!trend) return 'secondary'
    if (trend.includes('+')) return 'default'
    if (trend.includes('-')) return 'destructive'
    return 'secondary'
  }

  const getVariantStyle = (variant: string) => {
    switch (variant) {
      case 'success':
        return 'border-green-200 bg-green-50'
      case 'warning':
        return 'border-yellow-200 bg-yellow-50'
      case 'destructive':
        return 'border-red-200 bg-red-50'
      default:
        return ''
    }
  }

  return (
    <Card className={getVariantStyle(variant)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="h-4 w-4 text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          {description && <span>{description}</span>}
          {trend && (
            <Badge variant={getTrendColor(trend)} className="text-xs">
              {trend}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface ProgressRingProps {
  value: number
  max: number
  label: string
  color?: string
  size?: 'sm' | 'md' | 'lg'
}

export function ProgressRing({ 
  value, 
  max, 
  label, 
  color = 'blue', 
  size = 'md' 
}: ProgressRingProps) {
  const percentage = (value / max) * 100
  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  const sizes = {
    sm: { w: 80, h: 80, stroke: 4, text: 'text-lg' },
    md: { w: 120, h: 120, stroke: 6, text: 'text-xl' },
    lg: { w: 160, h: 160, stroke: 8, text: 'text-2xl' }
  }

  const sizeConfig = sizes[size]

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={sizeConfig.w}
        height={sizeConfig.h}
        className="transform -rotate-90"
      >
        <circle
          cx="50%"
          cy="50%"
          r="45"
          stroke="currentColor"
          strokeWidth={sizeConfig.stroke}
          fill="none"
          className="text-gray-200"
        />
        <circle
          cx="50%"
          cy="50%"
          r="45"
          stroke={`rgb(var(--${color}-500))`}
          strokeWidth={sizeConfig.stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-in-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-bold ${sizeConfig.text}`}>
          {Math.round(percentage)}%
        </span>
        <span className="text-xs text-muted-foreground text-center">
          {label}
        </span>
      </div>
    </div>
  )
}

interface ChartData {
  label: string
  value: number
  color?: string
}

interface SimpleBarChartProps {
  data: ChartData[]
  title?: string
  height?: number
}

export function SimpleBarChart({ data, title, height = 200 }: SimpleBarChartProps) {
  const maxValue = Math.max(...data.map(item => item.value))

  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="flex items-center space-x-3">
            <div className="w-24 text-sm text-right truncate">
              {item.label}
            </div>
            <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
              <div
                className={`h-4 rounded-full transition-all duration-700 ease-out ${
                  item.color || 'bg-blue-500'
                }`}
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
              <span className="absolute right-2 top-0 text-xs text-white font-medium leading-4">
                {item.value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'warning' | 'maintenance'
  label: string
  description?: string
}

export function StatusIndicator({ status, label, description }: StatusIndicatorProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'online':
        return { color: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50' }
      case 'warning':
        return { color: 'bg-yellow-500', text: 'text-yellow-700', bg: 'bg-yellow-50' }
      case 'offline':
        return { color: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' }
      case 'maintenance':
        return { color: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' }
      default:
        return { color: 'bg-gray-500', text: 'text-gray-700', bg: 'bg-gray-50' }
    }
  }

  const config = getStatusConfig(status)

  return (
    <div className={`flex items-center space-x-3 p-3 rounded-lg ${config.bg}`}>
      <div className="relative">
        <div className={`w-3 h-3 rounded-full ${config.color}`} />
        <div className={`absolute top-0 left-0 w-3 h-3 rounded-full ${config.color} animate-ping opacity-75`} />
      </div>
      <div>
        <div className={`font-medium ${config.text}`}>{label}</div>
        {description && (
          <div className="text-sm text-muted-foreground">{description}</div>
        )}
      </div>
    </div>
  )
}
