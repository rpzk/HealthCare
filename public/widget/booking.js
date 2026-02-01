/**
 * Healthcare Booking Widget
 * 
 * Widget embedável para agendamento público em sites de clínicas
 * 
 * USO:
 * <div id="healthcare-booking"></div>
 * <script src="https://seusite.com.br/widget/booking.js" data-clinic="CLINIC_ID"></script>
 */

(function() {
  'use strict';

  // ============= Configuration =============
  
  const WIDGET_VERSION = '1.0.0';
  const API_BASE = window.HEALTHCARE_API_URL || 'https://healthcare.local/api/public/booking';
  
  // Detectar clinic ID do script tag
  const scriptTag = document.currentScript || document.querySelector('script[data-clinic]');
  const CLINIC_ID = scriptTag?.getAttribute('data-clinic') || '';
  const CONTAINER_ID = scriptTag?.getAttribute('data-container') || 'healthcare-booking';
  
  if (!CLINIC_ID) {
    console.error('[HealthcareWidget] data-clinic attribute is required');
    return;
  }

  // ============= State =============
  
  const state = {
    step: 1,
    config: null,
    specialties: [],
    professionals: [],
    slots: [],
    selectedSpecialty: null,
    selectedProfessional: null,
    selectedDate: null,
    selectedTime: null,
    formData: {
      patientName: '',
      patientCpf: '',
      patientPhone: '',
      patientEmail: '',
      reason: '',
      isFirstVisit: true,
      acceptedTerms: false
    },
    loading: false,
    error: null,
    success: null
  };

  // ============= Styles =============
  
  const styles = `
    .hcw-container {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 480px;
      margin: 0 auto;
      padding: 24px;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.1);
    }
    
    .hcw-dark .hcw-container {
      background: #1e293b;
      color: #f1f5f9;
    }
    
    .hcw-header {
      text-align: center;
      margin-bottom: 24px;
    }
    
    .hcw-logo {
      height: 48px;
      margin-bottom: 12px;
    }
    
    .hcw-title {
      font-size: 20px;
      font-weight: 600;
      margin: 0;
      color: #0f172a;
    }
    
    .hcw-dark .hcw-title {
      color: #f1f5f9;
    }
    
    .hcw-subtitle {
      font-size: 14px;
      color: #64748b;
      margin-top: 4px;
    }
    
    .hcw-steps {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-bottom: 24px;
    }
    
    .hcw-step {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 500;
      background: #e2e8f0;
      color: #64748b;
      transition: all 0.2s;
    }
    
    .hcw-step.active {
      background: var(--hcw-primary, #0ea5e9);
      color: white;
    }
    
    .hcw-step.completed {
      background: #22c55e;
      color: white;
    }
    
    .hcw-section-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 12px;
      color: #334155;
    }
    
    .hcw-dark .hcw-section-title {
      color: #e2e8f0;
    }
    
    .hcw-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }
    
    .hcw-card {
      padding: 16px;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    }
    
    .hcw-card:hover {
      border-color: var(--hcw-primary, #0ea5e9);
      background: #f0f9ff;
    }
    
    .hcw-card.selected {
      border-color: var(--hcw-primary, #0ea5e9);
      background: var(--hcw-primary, #0ea5e9);
      color: white;
    }
    
    .hcw-card-title {
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 4px;
    }
    
    .hcw-card-subtitle {
      font-size: 12px;
      opacity: 0.8;
    }
    
    .hcw-professional-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      text-align: left;
    }
    
    .hcw-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      color: #64748b;
    }
    
    .hcw-calendar {
      background: #f8fafc;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 20px;
    }
    
    .hcw-dark .hcw-calendar {
      background: #334155;
    }
    
    .hcw-calendar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    
    .hcw-calendar-nav {
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
      border-radius: 8px;
      color: #64748b;
    }
    
    .hcw-calendar-nav:hover {
      background: #e2e8f0;
    }
    
    .hcw-calendar-days {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
      text-align: center;
    }
    
    .hcw-calendar-day-name {
      font-size: 12px;
      color: #94a3b8;
      padding: 4px;
    }
    
    .hcw-calendar-day {
      padding: 8px;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .hcw-calendar-day:hover:not(.disabled) {
      background: var(--hcw-primary, #0ea5e9);
      color: white;
    }
    
    .hcw-calendar-day.selected {
      background: var(--hcw-primary, #0ea5e9);
      color: white;
      font-weight: 600;
    }
    
    .hcw-calendar-day.disabled {
      color: #cbd5e1;
      cursor: not-allowed;
    }
    
    .hcw-calendar-day.other-month {
      color: #94a3b8;
    }
    
    .hcw-time-slots {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 20px;
    }
    
    .hcw-time-slot {
      padding: 10px 8px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      text-align: center;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .hcw-time-slot:hover:not(.disabled) {
      border-color: var(--hcw-primary, #0ea5e9);
      background: #f0f9ff;
    }
    
    .hcw-time-slot.selected {
      background: var(--hcw-primary, #0ea5e9);
      color: white;
      border-color: var(--hcw-primary, #0ea5e9);
    }
    
    .hcw-time-slot.disabled {
      background: #f1f5f9;
      color: #94a3b8;
      cursor: not-allowed;
      text-decoration: line-through;
    }
    
    .hcw-form-group {
      margin-bottom: 16px;
    }
    
    .hcw-label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 6px;
      color: #334155;
    }
    
    .hcw-dark .hcw-label {
      color: #e2e8f0;
    }
    
    .hcw-input {
      width: 100%;
      padding: 12px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      transition: border-color 0.2s;
      box-sizing: border-box;
    }
    
    .hcw-input:focus {
      outline: none;
      border-color: var(--hcw-primary, #0ea5e9);
      box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }
    
    .hcw-dark .hcw-input {
      background: #334155;
      border-color: #475569;
      color: #f1f5f9;
    }
    
    .hcw-checkbox-group {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 16px;
    }
    
    .hcw-checkbox {
      width: 20px;
      height: 20px;
      margin-top: 2px;
    }
    
    .hcw-checkbox-label {
      font-size: 14px;
      color: #64748b;
    }
    
    .hcw-checkbox-label a {
      color: var(--hcw-primary, #0ea5e9);
    }
    
    .hcw-btn {
      width: 100%;
      padding: 14px;
      border: none;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .hcw-btn-primary {
      background: var(--hcw-primary, #0ea5e9);
      color: white;
    }
    
    .hcw-btn-primary:hover {
      background: var(--hcw-accent, #0284c7);
    }
    
    .hcw-btn-primary:disabled {
      background: #94a3b8;
      cursor: not-allowed;
    }
    
    .hcw-btn-secondary {
      background: transparent;
      border: 2px solid #e2e8f0;
      color: #64748b;
      margin-top: 8px;
    }
    
    .hcw-btn-secondary:hover {
      border-color: #cbd5e1;
      background: #f8fafc;
    }
    
    .hcw-error {
      background: #fef2f2;
      color: #dc2626;
      padding: 12px;
      border-radius: 8px;
      font-size: 14px;
      margin-bottom: 16px;
    }
    
    .hcw-success {
      text-align: center;
      padding: 32px 16px;
    }
    
    .hcw-success-icon {
      width: 64px;
      height: 64px;
      background: #22c55e;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
    }
    
    .hcw-success-icon svg {
      width: 32px;
      height: 32px;
      color: white;
    }
    
    .hcw-success-title {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #0f172a;
    }
    
    .hcw-success-code {
      font-size: 24px;
      font-weight: 700;
      color: var(--hcw-primary, #0ea5e9);
      background: #f0f9ff;
      padding: 12px 24px;
      border-radius: 8px;
      display: inline-block;
      margin: 16px 0;
      letter-spacing: 2px;
    }
    
    .hcw-loading {
      text-align: center;
      padding: 32px;
      color: #64748b;
    }
    
    .hcw-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #e2e8f0;
      border-top-color: var(--hcw-primary, #0ea5e9);
      border-radius: 50%;
      animation: hcw-spin 0.8s linear infinite;
      margin: 0 auto 12px;
    }
    
    @keyframes hcw-spin {
      to { transform: rotate(360deg); }
    }
    
    .hcw-footer {
      text-align: center;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #94a3b8;
    }
  `;

  // ============= API Functions =============
  
  async function api(action, params = {}) {
    const url = new URL(API_BASE);
    url.searchParams.set('action', action);
    url.searchParams.set('clinic', CLINIC_ID);
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });
    
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error('API Error');
    return response.json();
  }
  
  async function apiPost(data) {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, clinicId: CLINIC_ID })
    });
    return response.json();
  }

  // ============= Render Functions =============
  
  function render() {
    const container = document.getElementById(CONTAINER_ID);
    if (!container) return;
    
    let html = `
      <div class="hcw-container" style="--hcw-primary: ${state.config?.primaryColor || '#0ea5e9'}; --hcw-accent: ${state.config?.accentColor || '#0284c7'}">
        ${renderHeader()}
        ${renderSteps()}
        ${state.loading ? renderLoading() : ''}
        ${state.error ? `<div class="hcw-error">${state.error}</div>` : ''}
        ${state.success ? renderSuccess() : renderCurrentStep()}
        ${renderFooter()}
      </div>
    `;
    
    container.innerHTML = html;
    attachEventListeners();
  }
  
  function renderHeader() {
    return `
      <div class="hcw-header">
        ${state.config?.clinicLogo ? `<img src="${state.config.clinicLogo}" class="hcw-logo" alt="">` : ''}
        <h2 class="hcw-title">Agende sua consulta</h2>
        <p class="hcw-subtitle">${state.config?.clinicName || 'Clínica'}</p>
      </div>
    `;
  }
  
  function renderSteps() {
    return `
      <div class="hcw-steps">
        <div class="hcw-step ${state.step >= 1 ? 'active' : ''} ${state.step > 1 ? 'completed' : ''}">1</div>
        <div class="hcw-step ${state.step >= 2 ? 'active' : ''} ${state.step > 2 ? 'completed' : ''}">2</div>
        <div class="hcw-step ${state.step >= 3 ? 'active' : ''} ${state.step > 3 ? 'completed' : ''}">3</div>
        <div class="hcw-step ${state.step >= 4 ? 'active' : ''}">4</div>
      </div>
    `;
  }
  
  function renderCurrentStep() {
    switch(state.step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      default: return '';
    }
  }
  
  function renderStep1() {
    // Seleção de especialidade
    return `
      <div class="hcw-step-content">
        <h3 class="hcw-section-title">Escolha a especialidade</h3>
        <div class="hcw-grid">
          ${state.specialties.map(spec => `
            <div class="hcw-card ${state.selectedSpecialty?.id === spec.id ? 'selected' : ''}" 
                 data-action="select-specialty" data-id="${spec.id}">
              <div class="hcw-card-title">${spec.name}</div>
              <div class="hcw-card-subtitle">${spec.availableProfessionals} profissional(is)</div>
            </div>
          `).join('')}
        </div>
        <button class="hcw-btn hcw-btn-primary" data-action="next" 
                ${!state.selectedSpecialty ? 'disabled' : ''}>
          Continuar
        </button>
      </div>
    `;
  }
  
  function renderStep2() {
    // Seleção de profissional (opcional)
    return `
      <div class="hcw-step-content">
        <h3 class="hcw-section-title">Escolha o profissional (opcional)</h3>
        <div class="hcw-grid">
          <div class="hcw-card ${!state.selectedProfessional ? 'selected' : ''}" 
               data-action="select-professional" data-id="">
            <div class="hcw-card-title">Qualquer</div>
            <div class="hcw-card-subtitle">Primeiro disponível</div>
          </div>
          ${state.professionals.map(prof => `
            <div class="hcw-card hcw-professional-card ${state.selectedProfessional?.id === prof.id ? 'selected' : ''}" 
                 data-action="select-professional" data-id="${prof.id}">
              <div class="hcw-avatar">${prof.name.charAt(0)}</div>
              <div>
                <div class="hcw-card-title">${prof.name}</div>
                <div class="hcw-card-subtitle">${prof.specialty}</div>
              </div>
            </div>
          `).join('')}
        </div>
        <button class="hcw-btn hcw-btn-primary" data-action="next">
          Continuar
        </button>
        <button class="hcw-btn hcw-btn-secondary" data-action="back">
          Voltar
        </button>
      </div>
    `;
  }
  
  function renderStep3() {
    // Seleção de data e horário
    const today = new Date();
    const currentMonth = state.currentMonth || today.getMonth();
    const currentYear = state.currentYear || today.getFullYear();
    
    return `
      <div class="hcw-step-content">
        <h3 class="hcw-section-title">Escolha a data e horário</h3>
        
        <div class="hcw-calendar">
          ${renderCalendar(currentMonth, currentYear)}
        </div>
        
        ${state.selectedDate ? `
          <h4 class="hcw-section-title">Horários disponíveis</h4>
          <div class="hcw-time-slots">
            ${state.slots.length === 0 ? '<p style="grid-column: 1/-1; text-align: center; color: #94a3b8;">Nenhum horário disponível</p>' : ''}
            ${state.slots.map(slot => `
              <div class="hcw-time-slot ${slot.available ? '' : 'disabled'} ${state.selectedTime === slot.time ? 'selected' : ''}"
                   data-action="select-time" data-time="${slot.time}" ${slot.available ? '' : 'disabled'}>
                ${slot.time}
              </div>
            `).join('')}
          </div>
        ` : '<p style="text-align: center; color: #94a3b8;">Selecione uma data acima</p>'}
        
        <button class="hcw-btn hcw-btn-primary" data-action="next" 
                ${!state.selectedDate || !state.selectedTime ? 'disabled' : ''}>
          Continuar
        </button>
        <button class="hcw-btn hcw-btn-secondary" data-action="back">
          Voltar
        </button>
      </div>
    `;
  }
  
  function renderCalendar(month, year) {
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const dayNames = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let days = '';
    for (let i = 0; i < firstDay; i++) {
      days += '<div class="hcw-calendar-day other-month"></div>';
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const isPast = date < today;
      const isSelected = state.selectedDate === dateStr;
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + (state.config?.maxAdvanceDays || 60));
      const isTooFar = date > maxDate;
      
      const disabled = isWeekend || isPast || isTooFar;
      
      days += `
        <div class="hcw-calendar-day ${disabled ? 'disabled' : ''} ${isSelected ? 'selected' : ''}"
             data-action="${disabled ? '' : 'select-date'}" data-date="${dateStr}">
          ${day}
        </div>
      `;
    }
    
    return `
      <div class="hcw-calendar-header">
        <button class="hcw-calendar-nav" data-action="prev-month">❮</button>
        <strong>${monthNames[month]} ${year}</strong>
        <button class="hcw-calendar-nav" data-action="next-month">❯</button>
      </div>
      <div class="hcw-calendar-days">
        ${dayNames.map(d => `<div class="hcw-calendar-day-name">${d}</div>`).join('')}
        ${days}
      </div>
    `;
  }
  
  function renderStep4() {
    // Formulário de dados
    return `
      <div class="hcw-step-content">
        <h3 class="hcw-section-title">Seus dados</h3>
        
        <div class="hcw-form-group">
          <label class="hcw-label">Nome completo *</label>
          <input type="text" class="hcw-input" data-field="patientName" 
                 value="${state.formData.patientName}" placeholder="Digite seu nome completo">
        </div>
        
        <div class="hcw-form-group">
          <label class="hcw-label">CPF *</label>
          <input type="text" class="hcw-input" data-field="patientCpf" 
                 value="${state.formData.patientCpf}" placeholder="000.000.000-00" maxlength="14">
        </div>
        
        <div class="hcw-form-group">
          <label class="hcw-label">Telefone (WhatsApp) *</label>
          <input type="tel" class="hcw-input" data-field="patientPhone" 
                 value="${state.formData.patientPhone}" placeholder="(00) 00000-0000" maxlength="15">
        </div>
        
        <div class="hcw-form-group">
          <label class="hcw-label">E-mail</label>
          <input type="email" class="hcw-input" data-field="patientEmail" 
                 value="${state.formData.patientEmail}" placeholder="seu@email.com">
        </div>
        
        <div class="hcw-form-group">
          <label class="hcw-label">Motivo da consulta</label>
          <input type="text" class="hcw-input" data-field="reason" 
                 value="${state.formData.reason}" placeholder="Descreva brevemente">
        </div>
        
        <div class="hcw-checkbox-group">
          <input type="checkbox" class="hcw-checkbox" data-field="isFirstVisit" 
                 ${state.formData.isFirstVisit ? 'checked' : ''}>
          <label class="hcw-checkbox-label">Esta é minha primeira consulta nesta clínica</label>
        </div>
        
        <div class="hcw-checkbox-group">
          <input type="checkbox" class="hcw-checkbox" data-field="acceptedTerms" 
                 ${state.formData.acceptedTerms ? 'checked' : ''}>
          <label class="hcw-checkbox-label">
            Li e aceito os <a href="${state.config?.termsUrl || '/terms'}" target="_blank">Termos de Uso</a> 
            e a <a href="${state.config?.privacyUrl || '/privacy'}" target="_blank">Política de Privacidade</a>
          </label>
        </div>
        
        <button class="hcw-btn hcw-btn-primary" data-action="submit" 
                ${!state.formData.acceptedTerms ? 'disabled' : ''}>
          Confirmar Agendamento
        </button>
        <button class="hcw-btn hcw-btn-secondary" data-action="back">
          Voltar
        </button>
      </div>
    `;
  }
  
  function renderSuccess() {
    return `
      <div class="hcw-success">
        <div class="hcw-success-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h3 class="hcw-success-title">Agendamento Confirmado!</h3>
        <p>Sua consulta foi agendada com sucesso.</p>
        <div class="hcw-success-code">${state.success.confirmationCode}</div>
        <p style="color: #64748b; font-size: 14px;">
          Guarde este código para consultar ou cancelar seu agendamento.
        </p>
        <p style="margin-top: 16px;">
          <strong>${formatDate(state.success.appointmentDate)}</strong>
          ${state.success.professionalName ? `<br>com ${state.success.professionalName}` : ''}
        </p>
        <button class="hcw-btn hcw-btn-secondary" data-action="new-booking" style="margin-top: 24px;">
          Fazer novo agendamento
        </button>
      </div>
    `;
  }
  
  function renderLoading() {
    return `
      <div class="hcw-loading">
        <div class="hcw-spinner"></div>
        <p>Carregando...</p>
      </div>
    `;
  }
  
  function renderFooter() {
    return `
      <div class="hcw-footer">
        Powered by Healthcare v${WIDGET_VERSION}
      </div>
    `;
  }

  // ============= Event Handlers =============
  
  function attachEventListeners() {
    const container = document.getElementById(CONTAINER_ID);
    if (!container) return;
    
    container.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', handleAction);
    });
    
    container.querySelectorAll('[data-field]').forEach(el => {
      el.addEventListener('input', handleInput);
      el.addEventListener('change', handleInput);
    });
  }
  
  function handleAction(e) {
    const action = e.currentTarget.getAttribute('data-action');
    if (!action) return;
    
    switch(action) {
      case 'select-specialty':
        const specId = e.currentTarget.getAttribute('data-id');
        state.selectedSpecialty = state.specialties.find(s => s.id === specId);
        render();
        break;
        
      case 'select-professional':
        const profId = e.currentTarget.getAttribute('data-id');
        state.selectedProfessional = profId ? state.professionals.find(p => p.id === profId) : null;
        render();
        break;
        
      case 'select-date':
        const dateStr = e.currentTarget.getAttribute('data-date');
        if (dateStr) {
          state.selectedDate = dateStr;
          state.selectedTime = null;
          loadSlots();
        }
        break;
        
      case 'select-time':
        const time = e.currentTarget.getAttribute('data-time');
        const slot = state.slots.find(s => s.time === time);
        if (slot?.available) {
          state.selectedTime = time;
          render();
        }
        break;
        
      case 'prev-month':
        state.currentMonth = (state.currentMonth || new Date().getMonth()) - 1;
        if (state.currentMonth < 0) {
          state.currentMonth = 11;
          state.currentYear = (state.currentYear || new Date().getFullYear()) - 1;
        }
        render();
        break;
        
      case 'next-month':
        state.currentMonth = (state.currentMonth || new Date().getMonth()) + 1;
        if (state.currentMonth > 11) {
          state.currentMonth = 0;
          state.currentYear = (state.currentYear || new Date().getFullYear()) + 1;
        }
        render();
        break;
        
      case 'next':
        goToNextStep();
        break;
        
      case 'back':
        state.step = Math.max(1, state.step - 1);
        state.error = null;
        render();
        break;
        
      case 'submit':
        submitBooking();
        break;
        
      case 'new-booking':
        resetState();
        break;
    }
  }
  
  function handleInput(e) {
    const field = e.target.getAttribute('data-field');
    if (!field) return;
    
    if (e.target.type === 'checkbox') {
      state.formData[field] = e.target.checked;
    } else {
      let value = e.target.value;
      
      // Formatação automática
      if (field === 'patientCpf') {
        value = formatCPF(value);
        e.target.value = value;
      } else if (field === 'patientPhone') {
        value = formatPhone(value);
        e.target.value = value;
      }
      
      state.formData[field] = value;
    }
    
    // Re-render apenas botões para atualizar disabled state
    const submitBtn = document.querySelector('[data-action="submit"]');
    if (submitBtn) {
      submitBtn.disabled = !state.formData.acceptedTerms;
    }
  }
  
  async function goToNextStep() {
    if (state.step === 1 && state.config?.allowProfessionalSelection) {
      state.loading = true;
      render();
      await loadProfessionals();
      state.loading = false;
    }
    
    state.step++;
    state.error = null;
    render();
  }
  
  async function loadSlots() {
    state.loading = true;
    render();
    
    try {
      const data = await api('slots', {
        date: state.selectedDate,
        professional: state.selectedProfessional?.id
      });
      state.slots = data.slots || [];
    } catch (err) {
      state.error = 'Erro ao carregar horários';
    }
    
    state.loading = false;
    render();
  }
  
  async function loadProfessionals() {
    try {
      const data = await api('professionals', {
        specialty: state.selectedSpecialty?.name
      });
      state.professionals = data.professionals || [];
    } catch (err) {
      console.error('Error loading professionals:', err);
    }
  }
  
  async function submitBooking() {
    state.loading = true;
    state.error = null;
    render();
    
    try {
      const result = await apiPost({
        action: 'book',
        specialtyId: state.selectedSpecialty?.id,
        professionalId: state.selectedProfessional?.id,
        date: state.selectedDate,
        time: state.selectedTime,
        ...state.formData
      });
      
      if (result.success) {
        state.success = result;
      } else {
        state.error = result.message || result.errors?.join(', ') || 'Erro ao agendar';
      }
    } catch (err) {
      state.error = 'Erro de conexão. Tente novamente.';
    }
    
    state.loading = false;
    render();
  }
  
  function resetState() {
    state.step = 1;
    state.selectedSpecialty = null;
    state.selectedProfessional = null;
    state.selectedDate = null;
    state.selectedTime = null;
    state.slots = [];
    state.formData = {
      patientName: '',
      patientCpf: '',
      patientPhone: '',
      patientEmail: '',
      reason: '',
      isFirstVisit: true,
      acceptedTerms: false
    };
    state.error = null;
    state.success = null;
    state.currentMonth = new Date().getMonth();
    state.currentYear = new Date().getFullYear();
    render();
  }

  // ============= Utilities =============
  
  function formatCPF(value) {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0,3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6)}`;
    return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`;
  }
  
  function formatPhone(value) {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
  }
  
  function formatDate(dateStr) {
    const date = new Date(dateStr);
    const options = { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString('pt-BR', options);
  }

  // ============= Initialize =============
  
  async function init() {
    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
    
    // Load initial data
    state.loading = true;
    render();
    
    try {
      const [configData, specialtiesData] = await Promise.all([
        api('config'),
        api('specialties')
      ]);
      
      state.config = configData;
      state.specialties = specialtiesData.specialties || [];
      state.currentMonth = new Date().getMonth();
      state.currentYear = new Date().getFullYear();
      
      // Apply theme colors
      if (state.config?.primaryColor) {
        document.documentElement.style.setProperty('--hcw-primary', state.config.primaryColor);
      }
    } catch (err) {
      state.error = 'Erro ao carregar configurações';
    }
    
    state.loading = false;
    render();
  }
  
  // Start widget when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
