'use client'

import Link from 'next/link'
import { 
  Activity, 
  Heart, 
  Shield, 
  Smartphone, 
  Users, 
  ClipboardList,
  Video,
  FileText,
  Calendar,
  Brain,
  Lock,
  Zap,
  CheckCircle2,
  ArrowRight,
  Stethoscope,
  Pill,
  TestTube,
  UserPlus,
  LogIn
} from 'lucide-react'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header/Navigation */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Heart className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">HealthCare</span>
            </div>
            

            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-700 hover:text-blue-600 transition">
                Funcionalidades
              </a>
              <a href="#benefits" className="text-gray-700 hover:text-blue-600 transition">
                Benefícios
              </a>
              <a href="#for-who" className="text-gray-700 hover:text-blue-600 transition">
                Para Quem
              </a>
              <Link href="/docs" className="text-gray-700 hover:text-blue-600 transition font-medium">
                Documentação
              </Link>
            </nav>

            <div className="flex items-center space-x-4">
              <Link 
                href="/auth/signin"
                className="text-gray-700 hover:text-blue-600 transition font-medium"
              >
                Entrar
              </Link>
              <Link 
                href="/register"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Cadastrar-se
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium">
                <Zap className="h-4 w-4" />
                <span>Plataforma Completa de Saúde Digital</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
                Gestão em Saúde 
                <span className="text-blue-600"> Completa e Integrada</span>
              </h1>
              
              <p className="text-xl text-gray-600 leading-relaxed">
                Prontuário eletrônico, telemedicina, prescrições digitais, agendamentos e muito mais. 
                Tecnologia de ponta para um atendimento humanizado e eficiente.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                  href="/register"
                  className="inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-lg shadow-lg hover:shadow-xl"
                >
                  <UserPlus className="h-5 w-5 mr-2" />
                  Começar Agora
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Link>
                
                <Link 
                  href="/auth/signin"
                  className="inline-flex items-center justify-center px-8 py-4 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold text-lg border-2 border-gray-200"
                >
                  <LogIn className="h-5 w-5 mr-2" />
                  Fazer Login
                </Link>
              </div>

              <div className="flex items-center space-x-8 pt-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-gray-600">Cadastro rápido</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-gray-600">Foco em segurança</span>
                </div>
              </div>
            </div>

            <div className="relative hidden md:block">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-3xl blur-3xl opacity-20"></div>
              <div className="relative bg-white rounded-3xl shadow-2xl p-8 border border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-6 rounded-2xl">
                    <Activity className="h-8 w-8 text-blue-600 mb-2" />
                    <div className="text-2xl font-bold text-gray-900">Online</div>
                    <div className="text-sm text-gray-600">Acesso</div>
                  </div>
                  <div className="bg-green-50 p-6 rounded-2xl">
                    <Users className="h-8 w-8 text-green-600 mb-2" />
                    <div className="text-2xl font-bold text-gray-900">Acesso</div>
                    <div className="text-sm text-gray-600">Controlado</div>
                  </div>
                  <div className="bg-purple-50 p-6 rounded-2xl">
                    <Heart className="h-8 w-8 text-purple-600 mb-2" />
                    <div className="text-2xl font-bold text-gray-900">Prático</div>
                    <div className="text-sm text-gray-600">No dia a dia</div>
                  </div>
                  <div className="bg-orange-50 p-6 rounded-2xl">
                    <Shield className="h-8 w-8 text-orange-600 mb-2" />
                    <div className="text-2xl font-bold text-gray-900">LGPD</div>
                    <div className="text-sm text-gray-600">Privacidade</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Plataforma completa com todas as ferramentas essenciais para gestão moderna em saúde
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-2xl hover:shadow-xl transition group">
              <div className="h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <ClipboardList className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Prontuário Eletrônico</h3>
              <p className="text-gray-600">
                Sistema completo de prontuário digital com histórico, evolução, SOAP e integração com IA para análise clínica.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-8 rounded-2xl hover:shadow-xl transition group">
              <div className="h-12 w-12 bg-green-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <Video className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Telemedicina</h3>
              <p className="text-gray-600">
                Videochamadas seguras, gravação de consultas, sala de espera virtual e notificações em tempo real.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-8 rounded-2xl hover:shadow-xl transition group">
              <div className="h-12 w-12 bg-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Prescrições Digitais</h3>
              <p className="text-gray-600">
                Prescrições com registro no sistema, rastreabilidade e histórico para o paciente.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-8 rounded-2xl hover:shadow-xl transition group">
              <div className="h-12 w-12 bg-orange-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Agendamentos</h3>
              <p className="text-gray-600">
                Sistema inteligente de agendamentos com confirmação automática, lembretes e gestão de horários.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-8 rounded-2xl hover:shadow-xl transition group">
              <div className="h-12 w-12 bg-pink-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Inteligência Artificial</h3>
              <p className="text-gray-600">
                IA para análise de sintomas, sugestão de tratamentos, interações medicamentosas e insights clínicos.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-8 rounded-2xl hover:shadow-xl transition group">
              <div className="h-12 w-12 bg-cyan-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Segurança Total</h3>
              <p className="text-gray-600">
                Controles de acesso, auditoria e recursos de privacidade para apoiar a conformidade com a LGPD.
              </p>
            </div>

            {/* Feature 7 */}
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-8 rounded-2xl hover:shadow-xl transition group">
              <div className="h-12 w-12 bg-yellow-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <TestTube className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Exames e Laudos</h3>
              <p className="text-gray-600">
                Solicitação de exames, upload de resultados e histórico completo.
              </p>
            </div>

            {/* Feature 8 */}
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-8 rounded-2xl hover:shadow-xl transition group">
              <div className="h-12 w-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <Pill className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Gestão de Medicamentos</h3>
              <p className="text-gray-600">
                Controle de estoque, validade, formulário de medicamentos e rastreamento completo.
              </p>
            </div>

            {/* Feature 9 */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 p-8 rounded-2xl hover:shadow-xl transition group">
              <div className="h-12 w-12 bg-red-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <Smartphone className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">App do Paciente</h3>
              <p className="text-gray-600">
                Portal exclusivo para pacientes com acesso a consultas, exames, receitas e histórico médico.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Por que escolher o HealthCare?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Benefícios que fazem a diferença no seu dia a dia
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <div className="flex items-start space-x-4">
                <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Economia de Tempo</h3>
                  <p className="text-gray-600">
                    Reduza o tempo gasto com tarefas administrativas e foque no que realmente importa: o paciente.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <div className="flex items-start space-x-4">
                <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Mais Produtividade</h3>
                  <p className="text-gray-600">
                    Atenda mais pacientes com a mesma qualidade. Automação inteligente de processos repetitivos.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <div className="flex items-start space-x-4">
                <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Segurança Garantida</h3>
                  <p className="text-gray-600">
                    Recursos de privacidade e segurança para apoiar a conformidade com a LGPD.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <div className="flex items-start space-x-4">
                <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Suporte Dedicado</h3>
                  <p className="text-gray-600">
                    Equipe especializada pronta para ajudar. Treinamento completo e atualizações constantes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Who Section */}
      <section id="for-who" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Para quem é o HealthCare?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Solução completa para diferentes profissionais e instituições de saúde
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="h-20 w-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Stethoscope className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Profissionais</h3>
              <p className="text-gray-600">
                Médicos, enfermeiros, fisioterapeutas e todos os profissionais de saúde que buscam modernizar o atendimento.
              </p>
            </div>

            <div className="text-center">
              <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Clínicas</h3>
              <p className="text-gray-600">
                Clínicas e consultórios que querem otimizar processos, reduzir custos e aumentar a satisfação dos pacientes.
              </p>
            </div>

            <div className="text-center">
              <div className="h-20 w-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="h-10 w-10 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Pacientes</h3>
              <p className="text-gray-600">
                Acesso fácil ao histórico médico, agendamentos online e acompanhamento completo da sua saúde.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Pronto para transformar seu atendimento?
          </h2>
          <p className="text-xl text-blue-100 mb-10">
            Junte-se a profissionais que confiam no HealthCare
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/register"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition font-semibold text-lg shadow-xl"
            >
              <UserPlus className="h-5 w-5 mr-2" />
              Criar Conta Grátis
              <ArrowRight className="h-5 w-5 ml-2" />
            </Link>
            
            <Link 
              href="/auth/signin"
              className="inline-flex items-center justify-center px-8 py-4 bg-transparent text-white rounded-lg hover:bg-white/10 transition font-semibold text-lg border-2 border-white"
            >
              <LogIn className="h-5 w-5 mr-2" />
              Já Tenho Conta
            </Link>
          </div>

          <p className="text-blue-100 mt-8 text-sm">
            Cadastro em minutos • Suporte em português
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Heart className="h-6 w-6 text-blue-500" />
                <span className="text-xl font-bold text-white">HealthCare</span>
              </div>
              <p className="text-sm">
                Plataforma completa de gestão em saúde. Tecnologia a serviço do cuidado humano.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Produto</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition">Funcionalidades</a></li>
                <li><a href="#benefits" className="hover:text-white transition">Benefícios</a></li>
                <li><a href="#for-who" className="hover:text-white transition">Para Quem</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/help" className="hover:text-white transition">Ajuda</a></li>
                <li><a href="/settings/privacy" className="hover:text-white transition">Privacidade</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Acesso</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/auth/signin" className="hover:text-white transition">
                    Login
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="hover:text-white transition">
                    Cadastro
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm">
              © {new Date().getFullYear()} HealthCare. Todos os direitos reservados.
            </p>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <Lock className="h-4 w-4" />
              <span className="text-sm">Recursos de privacidade e segurança para apoiar a LGPD</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
