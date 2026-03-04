import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <div className="bg-card rounded-lg p-6 md:p-8 shadow-lg">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Política de Privacidade
          </h1>
          <p className="text-muted-foreground mb-8">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>

          <div className="space-y-6 text-foreground">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Informações Gerais</h2>
              <p className="text-muted-foreground leading-relaxed">
                O JTC FluxPDV é um sistema de ponto de venda (PDV) desenvolvido por <strong>Jardiel De Sousa Lopes</strong>, criador da JTC. Esta Política de Privacidade descreve como coletamos, usamos e protegemos suas informações pessoais ao utilizar nosso aplicativo.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Dados Coletados</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Coletamos os seguintes tipos de informações:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Dados de cadastro: nome completo, CPF, e-mail, telefone e endereço</li>
                <li>Dados de uso: histórico de vendas, produtos cadastrados, clientes e fornecedores</li>
                <li>Dados de pagamento: informações relacionadas à assinatura do serviço</li>
                <li>Dados técnicos: informações do dispositivo e logs de acesso</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Uso das Informações</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Utilizamos suas informações para:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Fornecer e manter o funcionamento do sistema</li>
                <li>Processar transações e gerenciar sua conta</li>
                <li>Enviar comunicações importantes sobre o serviço</li>
                <li>Melhorar a experiência do usuário</li>
                <li>Cumprir obrigações legais e regulatórias</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Compartilhamento de Dados</h2>
              <p className="text-muted-foreground leading-relaxed">
                Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros para fins de marketing. Podemos compartilhar dados apenas com provedores de serviços essenciais para o funcionamento do sistema, sempre respeitando a legislação vigente.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Segurança dos Dados</h2>
              <p className="text-muted-foreground leading-relaxed">
                Implementamos medidas de segurança técnicas e organizacionais para proteger suas informações contra acesso não autorizado, alteração, divulgação ou destruição. Utilizamos criptografia e protocolos seguros para transmissão de dados.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Seus Direitos</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem direito a:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Acessar seus dados pessoais</li>
                <li>Corrigir dados incompletos ou desatualizados</li>
                <li>Solicitar a exclusão de seus dados</li>
                <li>Revogar o consentimento a qualquer momento</li>
                <li>Solicitar a portabilidade dos dados</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Retenção de Dados</h2>
              <p className="text-muted-foreground leading-relaxed">
                Mantemos seus dados pessoais pelo tempo necessário para cumprir as finalidades descritas nesta política, ou conforme exigido por lei. Após esse período, os dados serão excluídos de forma segura.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Alterações na Política</h2>
              <p className="text-muted-foreground leading-relaxed">
                Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre mudanças significativas através do aplicativo ou por e-mail. Recomendamos revisar esta página regularmente.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Contato</h2>
              <p className="text-muted-foreground leading-relaxed">
                Para dúvidas, solicitações ou exercício de seus direitos relacionados à privacidade, entre em contato com <strong>Jardiel De Sousa Lopes</strong> através dos canais disponíveis no aplicativo.
              </p>
            </section>

            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground text-center">
                © {new Date().getFullYear()} JTC FluxPDV - Desenvolvido por Jardiel De Sousa Lopes
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
