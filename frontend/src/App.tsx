import { useEffect, useState } from 'react'
import RegistrarReceita from './pages/RegistrarReceita'
import RegistrarDespesa from './pages/RegistrarDespesa'
import HistoricoRegistro from './pages/HistoricoRegistro'
import MetasFinanceiras from './pages/MetasFinanceiras'
import CadastroUsuario from './pages/CadastroUsuario'
import Login from './pages/Login'
import { encerrarSessao, obterSessao } from './services/sessao'
import './styles/historicoRegistros.css'
import './styles/sessao.css'

type Pagina =
  | 'cadastro'
  | 'login'
  | 'receitas'
  | 'despesas'
  | 'historico'
  | 'metas'

const PAGINAS_PROTEGIDAS: Record<string, Pagina> = {
  '#/receitas': 'receitas',
  '#/despesas': 'despesas',
  '#/historico': 'historico',
  '#/metas': 'metas',
}

// Sem sessão: a primeira tela é o cadastro e as abas pedem login.
// Com sessão: abrir o link leva direto para o app.
function paginaAtual(): Pagina {
  const hash = window.location.hash
  const logado = obterSessao() !== null

  if (hash === '#/login') return logado ? 'receitas' : 'login'
  if (hash === '#/cadastro') return logado ? 'receitas' : 'cadastro'

  const protegida = PAGINAS_PROTEGIDAS[hash]
  if (protegida) return logado ? protegida : 'login'

  return logado ? 'receitas' : 'cadastro'
}

function App() {
  const [pagina, setPagina] = useState<Pagina>(paginaAtual)

  useEffect(() => {
    function navegar() {
      setPagina(paginaAtual())
    }
    window.addEventListener('hashchange', navegar)
    return () => window.removeEventListener('hashchange', navegar)
  }, [])

  function sair() {
    encerrarSessao()
    window.location.assign('#/login')
  }

  if (pagina === 'cadastro') return <CadastroUsuario />
  if (pagina === 'login') return <Login />

  return (
    <div className="orbi-aplicacao">
      <nav className="orbi-navegacao" aria-label="Navegação principal">
        <span className="orbi-marca">ORBI</span>
        <div className="orbi-links">
          <a href="#/receitas" aria-current={pagina === 'receitas' ? 'page' : undefined}>Registrar receita</a>
          <a href="#/despesas" aria-current={pagina === 'despesas' ? 'page' : undefined}>Registrar despesa</a>
          <a href="#/historico" aria-current={pagina === 'historico' ? 'page' : undefined}>Consultar histórico</a>
          <a href="#/metas" aria-current={pagina === 'metas' ? 'page' : undefined}>Metas financeiras</a>
          <button type="button" className="orbi-sair" onClick={sair}>Sair</button>
        </div>
      </nav>
      {pagina === 'metas' ? <MetasFinanceiras /> : pagina === 'historico' ? <HistoricoRegistro /> : pagina === 'despesas' ? <RegistrarDespesa /> : <RegistrarReceita />}
    </div>
  )
}
export default App