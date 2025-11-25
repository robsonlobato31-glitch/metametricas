import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BarChart3, Target, TrendingUp, Zap } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Dashboard Meta Ads</span>
          </div>
          <div className="flex gap-2">
            <Link to="/login">
              <Button variant="ghost">Entrar</Button>
            </Link>
            <Link to="/signup">
              <Button>Cadastrar</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            Gerencie Suas Campanhas de Anúncios em Um Só Lugar
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Centralize o gerenciamento de Meta Ads e Google Ads com métricas unificadas, alertas automáticos e relatórios detalhados.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Link to="/signup">
              <Button size="lg" className="text-lg px-8">
                Começar Agora
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Fazer Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-lg p-6 space-y-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Campanhas Unificadas</h3>
            <p className="text-slate-400">
              Visualize todas suas campanhas do Meta Ads e Google Ads em uma única interface.
            </p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-lg p-6 space-y-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Métricas Detalhadas</h3>
            <p className="text-slate-400">
              Acompanhe impressões, cliques, conversões e ROI com análises profundas.
            </p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-lg p-6 space-y-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Alertas Automáticos</h3>
            <p className="text-slate-400">
              Receba notificações quando suas campanhas ultrapassarem o orçamento definido.
            </p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-lg p-6 space-y-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Relatórios Completos</h3>
            <p className="text-slate-400">
              Exporte relatórios detalhados em PDF e Excel para análises aprofundadas.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/20 rounded-2xl p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Pronto para Otimizar Suas Campanhas?
          </h2>
          <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
            Comece gratuitamente e conecte até 2 contas de anúncios no plano Survival.
          </p>
          <Link to="/signup">
            <Button size="lg" className="text-lg px-12">
              Criar Conta Grátis
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950/50 backdrop-blur">
        <div className="container mx-auto px-4 py-8 text-center text-slate-400">
          <p>&copy; 2025 Dashboard Meta Ads. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
