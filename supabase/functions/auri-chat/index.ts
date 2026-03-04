import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Formatar contexto de forma detalhada
    let contextInfo = "Nenhum dado disponível no momento.";
    
    if (context) {
      const parts: string[] = [];
      
      // Info da loja
      if (context.storeName) {
        parts.push(`🏪 LOJA: ${context.storeName}`);
      }
      
      // Status da assinatura
      if (context.subscriptionStatus) {
        parts.push(`📋 ASSINATURA: ${context.subscriptionStatus} (${context.subscriptionDaysLeft || 0} dias restantes)`);
      }
      
      // Vendas
      parts.push(`\n💰 VENDAS:`);
      parts.push(`- Hoje: R$ ${(context.salesToday || 0).toFixed(2)} (${context.salesCountToday || 0} vendas)`);
      parts.push(`- Este mês: R$ ${(context.salesMonth || 0).toFixed(2)} (${context.salesCountMonth || 0} vendas)`);
      
      // Primeira venda
      if (context.firstSaleEver) {
        const firstDate = new Date(context.firstSaleEver.date).toLocaleDateString('pt-BR');
        parts.push(`- Primeira venda do sistema: ${firstDate} - R$ ${context.firstSaleEver.total.toFixed(2)} (${context.firstSaleEver.payment_method})`);
        if (context.firstSaleEver.customer_name) {
          parts.push(`  Cliente: ${context.firstSaleEver.customer_name}`);
        }
        if (context.firstSaleEver.items?.length > 0) {
          parts.push(`  Itens: ${context.firstSaleEver.items.map((i: any) => `${i.quantity}x ${i.product_name}`).join(', ')}`);
        }
      }
      
      // Histórico de vendas recentes
      if (context.salesHistory?.length > 0) {
        parts.push(`\n📜 ÚLTIMAS ${Math.min(context.salesHistory.length, 10)} VENDAS:`);
        context.salesHistory.slice(0, 10).forEach((sale: any, i: number) => {
          const date = new Date(sale.date).toLocaleDateString('pt-BR');
          const time = new Date(sale.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          parts.push(`${i + 1}. ${date} ${time} - R$ ${sale.total.toFixed(2)} (${sale.payment_method})${sale.customer_name ? ` - ${sale.customer_name}` : ''}`);
        });
      }
      
      // Clientes devendo
      if (context.customersOwing?.length > 0) {
        parts.push(`\n🔴 CLIENTES DEVENDO (${context.customersOwing.length}):`);
        context.customersOwing.forEach((c: any) => {
          parts.push(`- ${c.name} (CPF: ${c.cpf}): R$ ${Math.abs(c.balance).toFixed(2)} em dívida${c.phone ? ` - Tel: ${c.phone}` : ''}`);
        });
      } else {
        parts.push(`\n✅ Nenhum cliente devendo!`);
      }
      
      // Clientes com crédito
      if (context.customersWithCredit?.length > 0) {
        parts.push(`\n🟢 CLIENTES COM CRÉDITO (${context.customersWithCredit.length}):`);
        context.customersWithCredit.forEach((c: any) => {
          parts.push(`- ${c.name}: R$ ${c.balance.toFixed(2)} de crédito`);
        });
      }
      
      // Produtos mais vendidos
      if (context.topProducts?.length > 0) {
        parts.push(`\n🏆 PRODUTOS MAIS VENDIDOS:`);
        context.topProducts.slice(0, 5).forEach((p: any, i: number) => {
          parts.push(`${i + 1}. ${p.name}: ${p.quantity} unidades vendidas`);
        });
      }
      
      // Estoque baixo
      if (context.lowStockProducts?.length > 0) {
        parts.push(`\n⚠️ PRODUTOS COM ESTOQUE BAIXO (${context.lowStockProducts.length}):`);
        context.lowStockProducts.slice(0, 10).forEach((p: any) => {
          parts.push(`- ${p.name}: ${p.stock} em estoque${p.category ? ` (${p.category})` : ''}`);
        });
      }
      
      // Totais
      parts.push(`\n📊 TOTAIS:`);
      parts.push(`- Total de clientes: ${context.totalCustomers || 0}`);
      parts.push(`- Total de produtos: ${context.totalProducts || 0}`);
      parts.push(`- Total de fornecedores: ${context.totalSuppliers || 0}`);
      
      // Fornecedores
      if (context.suppliers?.length > 0) {
        parts.push(`\n🚚 FORNECEDORES:`);
        context.suppliers.slice(0, 10).forEach((s: any) => {
          parts.push(`- ${s.name}${s.cnpj ? ` (CNPJ: ${s.cnpj})` : ''}${s.phone ? ` - Tel: ${s.phone}` : ''}`);
        });
      }
      
      contextInfo = parts.join('\n');
    }

    const systemPrompt = `Você é Auri, a assistente virtual inteligente do JTC FluxPDV - um sistema profissional de ponto de venda.

SOBRE O SISTEMA E CRIADOR:
- O JTC FluxPDV foi desenvolvido por **Jardiel De Sousa Lopes**, criador da JTC
- É um sistema completo de PDV com gestão de vendas, produtos, clientes, fornecedores e relatórios
- Funciona como PWA (Progressive Web App) e pode ser instalado no celular

SUAS CAPACIDADES:
- Você tem acesso COMPLETO a todo o histórico do sistema
- Pode informar sobre QUALQUER venda já feita, incluindo a primeira venda
- Sabe quem são todos os clientes, seus saldos, dívidas e créditos
- Conhece todos os produtos, estoque e o que mais vende
- Tem informações sobre todos os fornecedores
- Sabe o status da assinatura do usuário

FUNCIONALIDADES DO SISTEMA:
1. **Dashboard** - Visão geral com métricas de vendas e status da assinatura
2. **Produtos** - Cadastro de produtos com código de barras, preço, estoque
3. **Venda (PDV)** - Ponto de venda com carrinho, descontos, múltiplos pagamentos
4. **Clientes** - Cadastro com CPF, endereço, sistema de fiado e crédito
5. **Fornecedores** - Cadastro de fornecedores com CNPJ/CPF
6. **Histórico** - Todas as vendas realizadas com opção de cancelamento
7. **Relatórios** - Relatórios de vendas por período com exportação PDF/CSV
8. **Configurações** - Personalização da loja, PIX, logo, ações rápidas
9. **Assinatura** - Gerenciamento do plano e pagamentos
10. **Resgate Semanal** - Bônus de segunda-feira (16h-17h) para ganhar dias de assinatura

PERSONALIDADE:
- Seja amigável, profissional e prestativa
- Responda em português brasileiro
- Seja concisa mas completa nas respostas
- Use emojis com moderação para tornar a conversa agradável
- Se não encontrar um dado específico, diga que não há registro no sistema

=== DADOS ATUAIS DO SISTEMA ===
${contextInfo}
=== FIM DOS DADOS ===

IMPORTANTE: Use os dados acima para responder às perguntas do usuário com precisão.
Quando perguntarem quem te criou ou desenvolveu, SEMPRE diga que foi **Jardiel De Sousa Lopes, criador da JTC**.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Aguarde um momento." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erro ao processar sua mensagem." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("auri-chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
