import { useEffect, useState } from 'react'
import RegistrarReceita from './pages/RegistrarReceita'
import HistoricoRegistros from './pages/HistoricoRegistro'
import './styles/historicoRegistros.css'

function App() {
  const [historico, setHistorico] = useState(
    () => window.location.hash === '#/historico',
  )

  useEffect(() => {
    function acompanharNavegacao() {
      setHistorico(window.location.hash === '#/historico')
    }
    window.addEventListener('hashchange', acompanharNavegacao)
    return () => window.removeEventListener('hashchange', acompanharNavegacao)
  }, [])

  return (
    <div className="orbi-aplicacao">
      <nav className="orbi-navegacao" aria-label="Navegação principal">
        <span className="orbi-marca">ORBI</span>
        <div className="orbi-links">
          <a href="#/receitas" aria-current={!historico ? 'page' : undefined}>
            Registrar receita
          </a>
          <a href="#/historico" aria-current={historico ? 'page' : undefined}>
            Consultar histórico
          </a>
        </div>
      </nav>
      {historico ? <HistoricoRegistros /> : <RegistrarReceita />}
    </div>
  )
}

export default App
