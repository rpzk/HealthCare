"use client"

import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { 
  ChevronDown, 
  Activity, 
  Heart, 
  Brain, 
  Baby, 
  Stethoscope,
  ClipboardList
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

export interface BIData {
  // Tipo de Atendimento
  scheduledDemand: boolean
  immediateDemand: boolean
  orientationOnly: boolean
  urgencyWithObs: boolean
  continuedCare: boolean
  prescriptionRenewal: boolean
  examEvaluation: boolean
  homeVisit: boolean
  
  // Grupos de Atendimento
  mentalHealth: boolean
  alcoholUser: boolean
  drugUser: boolean
  hypertension: boolean
  diabetes: boolean
  leprosy: boolean
  tuberculosis: boolean
  prenatal: boolean
  postpartum: boolean
  stdAids: boolean
  preventive: boolean
  childCare: boolean
  
  // Condutas
  laboratory: boolean
  radiology: boolean
  ultrasound: boolean
  obstetricUltrasound: boolean
  mammography: boolean
  ecg: boolean
  pathology: boolean
  physiotherapy: boolean
  referralMade: boolean
}

interface ConsultationBICheckboxesProps {
  data: BIData
  onChange: (data: BIData) => void
  compact?: boolean
}

const Checkbox = ({ 
  id, 
  checked, 
  onChange, 
  label,
  compact = false 
}: { 
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  compact?: boolean
}) => (
  <div className={cn("flex items-center space-x-2", compact ? "py-0.5" : "py-1")}>
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="rounded border-input h-4 w-4 text-primary focus:ring-primary"
    />
    <Label 
      htmlFor={id} 
      className={cn(
        "cursor-pointer text-sm font-normal",
        checked ? "text-primary font-medium" : "text-muted-foreground"
      )}
    >
      {label}
    </Label>
  </div>
)

export function ConsultationBICheckboxes({ 
  data, 
  onChange,
  compact = false 
}: ConsultationBICheckboxesProps) {
  const [openSections, setOpenSections] = useState({
    attendance: true,
    groups: false,
    conducts: false
  })

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const updateField = (field: keyof BIData, value: boolean) => {
    onChange({ ...data, [field]: value })
  }

  // Contagem de itens marcados por seção
  const attendanceCount = [
    data.scheduledDemand, data.immediateDemand, data.orientationOnly,
    data.urgencyWithObs, data.continuedCare, data.prescriptionRenewal,
    data.examEvaluation, data.homeVisit
  ].filter(Boolean).length

  const groupsCount = [
    data.mentalHealth, data.alcoholUser, data.drugUser,
    data.hypertension, data.diabetes, data.leprosy,
    data.tuberculosis, data.prenatal, data.postpartum,
    data.stdAids, data.preventive, data.childCare
  ].filter(Boolean).length

  const conductsCount = [
    data.laboratory, data.radiology, data.ultrasound,
    data.obstetricUltrasound, data.mammography, data.ecg,
    data.pathology, data.physiotherapy, data.referralMade
  ].filter(Boolean).length

  return (
    <div className="space-y-2">
      {/* Tipo de Atendimento */}
      <Collapsible open={openSections.attendance} onOpenChange={() => toggleSection('attendance')}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Tipo de Atendimento</span>
            {attendanceCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {attendanceCount}
              </Badge>
            )}
          </div>
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform",
            openSections.attendance && "rotate-180"
          )} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 px-2">
          <div className={cn("grid gap-x-4", compact ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2")}>
            <Checkbox 
              id="scheduledDemand" 
              checked={data.scheduledDemand} 
              onChange={(v) => updateField('scheduledDemand', v)}
              label="Agendada"
              compact={compact}
            />
            <Checkbox 
              id="immediateDemand" 
              checked={data.immediateDemand} 
              onChange={(v) => updateField('immediateDemand', v)}
              label="Imediata"
              compact={compact}
            />
            <Checkbox 
              id="orientationOnly" 
              checked={data.orientationOnly} 
              onChange={(v) => updateField('orientationOnly', v)}
              label="Orientação"
              compact={compact}
            />
            <Checkbox 
              id="urgencyWithObs" 
              checked={data.urgencyWithObs} 
              onChange={(v) => updateField('urgencyWithObs', v)}
              label="Urgência"
              compact={compact}
            />
            <Checkbox 
              id="continuedCare" 
              checked={data.continuedCare} 
              onChange={(v) => updateField('continuedCare', v)}
              label="Continuado"
              compact={compact}
            />
            <Checkbox 
              id="prescriptionRenewal" 
              checked={data.prescriptionRenewal} 
              onChange={(v) => updateField('prescriptionRenewal', v)}
              label="Renovação"
              compact={compact}
            />
            <Checkbox 
              id="examEvaluation" 
              checked={data.examEvaluation} 
              onChange={(v) => updateField('examEvaluation', v)}
              label="Aval. Exame"
              compact={compact}
            />
            <Checkbox 
              id="homeVisit" 
              checked={data.homeVisit} 
              onChange={(v) => updateField('homeVisit', v)}
              label="Visita Dom."
              compact={compact}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Grupos de Atendimento */}
      <Collapsible open={openSections.groups} onOpenChange={() => toggleSection('groups')}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-red-500" />
            <span className="font-medium text-sm">Grupos de Atendimento</span>
            {groupsCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {groupsCount}
              </Badge>
            )}
          </div>
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform",
            openSections.groups && "rotate-180"
          )} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 px-2">
          <div className={cn("grid gap-x-4", compact ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2")}>
            <Checkbox 
              id="hypertension" 
              checked={data.hypertension} 
              onChange={(v) => updateField('hypertension', v)}
              label="Hipertensão"
              compact={compact}
            />
            <Checkbox 
              id="diabetes" 
              checked={data.diabetes} 
              onChange={(v) => updateField('diabetes', v)}
              label="Diabetes"
              compact={compact}
            />
            <Checkbox 
              id="mentalHealth" 
              checked={data.mentalHealth} 
              onChange={(v) => updateField('mentalHealth', v)}
              label="Saúde Mental"
              compact={compact}
            />
            <Checkbox 
              id="alcoholUser" 
              checked={data.alcoholUser} 
              onChange={(v) => updateField('alcoholUser', v)}
              label="Usuário Álcool"
              compact={compact}
            />
            <Checkbox 
              id="drugUser" 
              checked={data.drugUser} 
              onChange={(v) => updateField('drugUser', v)}
              label="Usuário Drogas"
              compact={compact}
            />
            <Checkbox 
              id="prenatal" 
              checked={data.prenatal} 
              onChange={(v) => updateField('prenatal', v)}
              label="Pré-Natal"
              compact={compact}
            />
            <Checkbox 
              id="postpartum" 
              checked={data.postpartum} 
              onChange={(v) => updateField('postpartum', v)}
              label="Puerpério"
              compact={compact}
            />
            <Checkbox 
              id="childCare" 
              checked={data.childCare} 
              onChange={(v) => updateField('childCare', v)}
              label="Puericultura"
              compact={compact}
            />
            <Checkbox 
              id="preventive" 
              checked={data.preventive} 
              onChange={(v) => updateField('preventive', v)}
              label="Preventivo"
              compact={compact}
            />
            <Checkbox 
              id="stdAids" 
              checked={data.stdAids} 
              onChange={(v) => updateField('stdAids', v)}
              label="DST/AIDS"
              compact={compact}
            />
            <Checkbox 
              id="tuberculosis" 
              checked={data.tuberculosis} 
              onChange={(v) => updateField('tuberculosis', v)}
              label="Tuberculose"
              compact={compact}
            />
            <Checkbox 
              id="leprosy" 
              checked={data.leprosy} 
              onChange={(v) => updateField('leprosy', v)}
              label="Hanseníase"
              compact={compact}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Condutas */}
      <Collapsible open={openSections.conducts} onOpenChange={() => toggleSection('conducts')}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-blue-500" />
            <span className="font-medium text-sm">Condutas</span>
            {conductsCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {conductsCount}
              </Badge>
            )}
          </div>
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform",
            openSections.conducts && "rotate-180"
          )} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 px-2">
          <div className={cn("grid gap-x-4", compact ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2")}>
            <Checkbox 
              id="laboratory" 
              checked={data.laboratory} 
              onChange={(v) => updateField('laboratory', v)}
              label="Laboratório"
              compact={compact}
            />
            <Checkbox 
              id="radiology" 
              checked={data.radiology} 
              onChange={(v) => updateField('radiology', v)}
              label="Radiologia"
              compact={compact}
            />
            <Checkbox 
              id="ultrasound" 
              checked={data.ultrasound} 
              onChange={(v) => updateField('ultrasound', v)}
              label="Ecografia"
              compact={compact}
            />
            <Checkbox 
              id="obstetricUltrasound" 
              checked={data.obstetricUltrasound} 
              onChange={(v) => updateField('obstetricUltrasound', v)}
              label="Eco Obstétrica"
              compact={compact}
            />
            <Checkbox 
              id="mammography" 
              checked={data.mammography} 
              onChange={(v) => updateField('mammography', v)}
              label="Mamografia"
              compact={compact}
            />
            <Checkbox 
              id="ecg" 
              checked={data.ecg} 
              onChange={(v) => updateField('ecg', v)}
              label="ECG"
              compact={compact}
            />
            <Checkbox 
              id="pathology" 
              checked={data.pathology} 
              onChange={(v) => updateField('pathology', v)}
              label="Patologia"
              compact={compact}
            />
            <Checkbox 
              id="physiotherapy" 
              checked={data.physiotherapy} 
              onChange={(v) => updateField('physiotherapy', v)}
              label="Fisioterapia"
              compact={compact}
            />
            <Checkbox 
              id="referralMade" 
              checked={data.referralMade} 
              onChange={(v) => updateField('referralMade', v)}
              label="Referência"
              compact={compact}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

// Estado inicial padrão
export const defaultBIData: BIData = {
  scheduledDemand: false,
  immediateDemand: false,
  orientationOnly: false,
  urgencyWithObs: false,
  continuedCare: false,
  prescriptionRenewal: false,
  examEvaluation: false,
  homeVisit: false,
  mentalHealth: false,
  alcoholUser: false,
  drugUser: false,
  hypertension: false,
  diabetes: false,
  leprosy: false,
  tuberculosis: false,
  prenatal: false,
  postpartum: false,
  stdAids: false,
  preventive: false,
  childCare: false,
  laboratory: false,
  radiology: false,
  ultrasound: false,
  obstetricUltrasound: false,
  mammography: false,
  ecg: false,
  pathology: false,
  physiotherapy: false,
  referralMade: false
}
