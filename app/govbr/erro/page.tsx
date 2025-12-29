'use client'

export default function ErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-red-700 mb-4">Erro na Autenticação</h1>
        <p className="text-gray-600 mb-6">Ocorreu um erro durante o processo de autenticação com GOV.BR</p>
        <a href="/" className="text-blue-600 hover:underline">Voltar à página inicial</a>
      </div>
    </div>
  )
}
