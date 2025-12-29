'use client'

export default function SuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-green-700 mb-4">Sucesso na Autenticação</h1>
        <p className="text-gray-600 mb-6">Você foi autenticado com sucesso no GOV.BR</p>
        <a href="/" className="text-blue-600 hover:underline">Voltar à página inicial</a>
      </div>
    </div>
  )
}
