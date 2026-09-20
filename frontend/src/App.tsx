import { useEffect, useState } from 'react'
import RegistrarReceita from './pages/RegistrarReceita'
import HistoricoRegistro from './pages/HistoricoRegistro'
import MetasFinanceiras from './pages/MetasFinanceiras'
import './styles/historicoRegistros.css'

function paginaAtual() {
  if (window.location.hash === '#/metas') return 'metas'
  if (window.location.hash === '#/historico') return 'historico'
  return 'receitas'
}
function App() {
  const [pagina, setPagina] = useState(paginaAtual)
  useEffect(() => {
    function navegar() { setPagina(paginaAtual()) }
    window.addEventListener('hashchange', navegar)
    return () => window.removeEventListener('hashchange', navegar)
  }, [])
  return (
    <div className="orbi-aplicacao">
      <nav className="orbi-navegacao" aria-label="Navegação principal">
        <span className="orbi-marca">ORBI</span>
        <div className="orbi-links">
          <a href="#/receitas" aria-current={pagina === 'receitas' ? 'page' : undefined}>Registrar receita</a>
          <a href="#/historico" aria-current={pagina === 'historico' ? 'page' : undefined}>Consultar histórico</a>
          <a href="#/metas" aria-current={pagina === 'metas' ? 'page' : undefined}>Metas financeiras</a>
        </div>
      </nav>
      {pagina === 'metas' ? <MetasFinanceiras /> : pagina === 'historico' ? <HistoricoRegistro /> : <RegistrarReceita />}
    </div>
  )
}
export default App

