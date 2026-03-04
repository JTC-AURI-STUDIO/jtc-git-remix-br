import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Send, Loader2, Sparkles, Plus, Trash2, MessageSquare, Home, History, X, ChevronDown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface AuriContext {
  storeName?: string;
  customersOwing: Array<{ name: string; cpf: string; balance: number; phone?: string }>;
  customersWithCredit: Array<{ name: string; cpf: string; balance: number }>;
  totalCustomers: number;
  salesToday: number;
  salesCountToday: number;
  salesMonth: number;
  salesCountMonth: number;
  salesHistory: Array<{
    id: string;
    date: string;
    total: number;
    payment_method: string;
    customer_name?: string;
    items: Array<{ product_name: string; quantity: number; unit_price: number }>;
  }>;
  firstSaleEver?: any;
  totalProducts: number;
  lowStockProducts: Array<{ name: string; price: number; stock: number; category?: string }>;
  topProducts: Array<{ name: string; quantity: number }>;
  totalSuppliers: number;
  suppliers: Array<{ name: string; cnpj?: string; phone?: string }>;
  subscriptionStatus?: string;
  subscriptionDaysLeft?: number;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auri-chat`;

const Auri = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState<AuriContext | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadConversations = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("auri_conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error("Erro ao carregar conversas:", error);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from("auri_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data?.map(m => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content })) || []);
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
    }
  }, []);

  const createConversation = useCallback(async (firstMessage: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const title = firstMessage.length > 40 ? firstMessage.substring(0, 40) + "..." : firstMessage;

      const { data, error } = await supabase
        .from("auri_conversations")
        .insert({ user_id: user.id, title })
        .select()
        .single();

      if (error) throw error;
      
      setConversations(prev => [data, ...prev]);
      setCurrentConversationId(data.id);
      return data.id;
    } catch (error) {
      console.error("Erro ao criar conversa:", error);
      return null;
    }
  }, []);

  const saveMessage = useCallback(async (conversationId: string, role: "user" | "assistant", content: string) => {
    try {
      const { error } = await supabase
        .from("auri_messages")
        .insert({ conversation_id: conversationId, role, content });

      if (error) throw error;

      await supabase
        .from("auri_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);
    } catch (error) {
      console.error("Erro ao salvar mensagem:", error);
    }
  }, []);

  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from("auri_conversations")
        .delete()
        .eq("id", conversationId);

      if (error) throw error;

      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      if (currentConversationId === conversationId) {
        setCurrentConversationId(null);
        setMessages([]);
      }

      toast({ title: "Conversa excluída" });
    } catch (error) {
      console.error("Erro ao excluir conversa:", error);
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  }, [currentConversationId, toast]);

  const selectConversation = useCallback((conversation: Conversation) => {
    setCurrentConversationId(conversation.id);
    loadMessages(conversation.id);
  }, [loadMessages]);

  const startNewConversation = useCallback(() => {
    setCurrentConversationId(null);
    setMessages([]);
  }, []);

  const loadContext = useCallback(async () => {
    setContextLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [
        customersResult,
        salesResult,
        saleItemsResult,
        productsResult,
        suppliersResult,
        profileResult,
        storeResult,
      ] = await Promise.all([
        supabase.from("customers").select("*").eq("user_id", user.id),
        supabase.from("sales").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("sale_items").select("*, sales!inner(user_id)").eq("sales.user_id", user.id),
        supabase.from("products").select("*, categories(name)").eq("user_id", user.id),
        supabase.from("suppliers").select("*").eq("user_id", user.id),
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("store_settings").select("store_name").eq("user_id", user.id).single(),
      ]);

      const customers = customersResult.data || [];
      const sales = salesResult.data || [];
      const saleItems = saleItemsResult.data || [];
      const products = productsResult.data || [];
      const suppliers = suppliersResult.data || [];
      const profile = profileResult.data;
      const store = storeResult.data;

      const customersOwing = customers
        .filter(c => c.current_balance < 0)
        .map(c => ({ name: c.name, cpf: c.cpf, balance: c.current_balance, phone: c.phone }));
      
      const customersWithCredit = customers
        .filter(c => c.current_balance > 0)
        .map(c => ({ name: c.name, cpf: c.cpf, balance: c.current_balance }));

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const salesTodayData = sales.filter(s => new Date(s.created_at) >= today);
      const salesMonthData = sales.filter(s => new Date(s.created_at) >= firstDayOfMonth);

      const salesWithItems = sales.slice(0, 50).map(sale => {
        const items = saleItems
          .filter(item => item.sale_id === sale.id)
          .map(item => ({
            product_name: item.product_name || "Produto",
            quantity: item.quantity,
            unit_price: Number(item.unit_price),
          }));
        const customer = customers.find(c => c.id === sale.customer_id);
        return {
          id: sale.id,
          date: sale.created_at,
          total: Number(sale.total_amount),
          payment_method: sale.payment_method,
          customer_name: customer?.name,
          items,
        };
      });

      const firstSale = sales.length > 0 ? sales[sales.length - 1] : null;
      let firstSaleEver = undefined;
      if (firstSale) {
        const firstSaleItems = saleItems
          .filter(item => item.sale_id === firstSale.id)
          .map(item => ({
            product_name: item.product_name || "Produto",
            quantity: item.quantity,
            unit_price: Number(item.unit_price),
          }));
        const firstCustomer = customers.find(c => c.id === firstSale.customer_id);
        firstSaleEver = {
          id: firstSale.id,
          date: firstSale.created_at,
          total: Number(firstSale.total_amount),
          payment_method: firstSale.payment_method,
          customer_name: firstCustomer?.name,
          items: firstSaleItems,
        };
      }

      const productSales: Record<string, number> = {};
      saleItems.forEach(item => {
        const name = item.product_name || "Produto";
        productSales[name] = (productSales[name] || 0) + item.quantity;
      });
      const topProducts = Object.entries(productSales)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, quantity]) => ({ name, quantity }));

      const lowStockProducts = products
        .filter(p => p.stock_quantity <= (p.min_stock_quantity ?? 5))
        .map(p => ({
          name: p.name,
          price: Number(p.price),
          stock: p.stock_quantity,
          category: (p.categories as any)?.name,
        }));

      let subscriptionStatus = "expirado";
      let subscriptionDaysLeft = 0;
      const now = new Date();
      
      if (profile?.subscription_ends_at && new Date(profile.subscription_ends_at) > now) {
        subscriptionStatus = "ativo";
        subscriptionDaysLeft = Math.ceil((new Date(profile.subscription_ends_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      } else if (profile?.trial_ends_at && new Date(profile.trial_ends_at) > now) {
        subscriptionStatus = "teste";
        subscriptionDaysLeft = Math.ceil((new Date(profile.trial_ends_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }

      setContext({
        storeName: store?.store_name || "Loja",
        customersOwing,
        customersWithCredit,
        totalCustomers: customers.length,
        salesToday: salesTodayData.reduce((sum, s) => sum + Number(s.total_amount), 0),
        salesCountToday: salesTodayData.length,
        salesMonth: salesMonthData.reduce((sum, s) => sum + Number(s.total_amount), 0),
        salesCountMonth: salesMonthData.length,
        salesHistory: salesWithItems,
        firstSaleEver,
        totalProducts: products.length,
        lowStockProducts,
        topProducts,
        totalSuppliers: suppliers.length,
        suppliers: suppliers.map(s => ({ name: s.name, cnpj: s.cnpj, phone: s.phone })),
        subscriptionStatus,
        subscriptionDaysLeft,
      });
    } catch (error) {
      console.error("Erro ao carregar contexto:", error);
    } finally {
      setContextLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContext();
    loadConversations();
  }, [loadContext, loadConversations]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const streamChat = async (userMessages: Message[]) => {
    const response = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: userMessages.map(m => ({ role: m.role, content: m.content })), context }),
    });

    if (!response.ok || !response.body) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Erro ao conectar com Auri");
    }

    return response.body.getReader();
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    let conversationId = currentConversationId;
    
    if (!conversationId) {
      conversationId = await createConversation(userMessage.content);
      if (!conversationId) {
        setIsLoading(false);
        toast({ title: "Erro ao criar conversa", variant: "destructive" });
        return;
      }
    }

    await saveMessage(conversationId, "user", userMessage.content);

    let assistantContent = "";

    try {
      const reader = await streamChat(newMessages);
      const decoder = new TextDecoder();
      let buffer = "";

      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const updated = [...prev];
                if (updated[updated.length - 1]?.role === "assistant") {
                  updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                }
                return updated;
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      if (assistantContent && conversationId) {
        await saveMessage(conversationId, "assistant", assistantContent);
      }
    } catch (error) {
      console.error("Erro no chat:", error);
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: "assistant", content: "Desculpe, ocorreu um erro. Tente novamente! 😊" }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return "Hoje";
    if (days === 1) return "Ontem";
    if (days < 7) return `${days} dias atrás`;
    return date.toLocaleDateString("pt-BR");
  };

  return (
    <div className="fixed inset-0 top-16 z-30 bg-background flex flex-col">
      {/* Chat Header */}
      <div className="h-14 px-4 flex items-center gap-3 border-b bg-gradient-to-r from-violet-600 to-purple-700 shrink-0">
        {/* Home Button */}
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 h-9 w-9"
          onClick={() => navigate("/dashboard")}
          title="Ir para Dashboard"
        >
          <Home className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center gap-3 flex-1">
          <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-white text-sm">Auri</h2>
            <p className="text-xs text-white/70">
              {contextLoading ? "Carregando..." : "Assistente IA"}
            </p>
          </div>
        </div>

        {/* History Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 h-9 w-9"
              title="Histórico"
            >
              <History className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 max-h-80 overflow-y-auto">
            <div className="px-2 py-1.5 text-sm font-semibold flex items-center justify-between">
              <span>Histórico de Conversas</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={startNewConversation}
                className="h-7 px-2"
              >
                <Plus className="h-4 w-4 mr-1" />
                Nova
              </Button>
            </div>
            <DropdownMenuSeparator />
            {conversations.length === 0 ? (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                Nenhuma conversa ainda
              </div>
            ) : (
              conversations.map(conv => (
                <DropdownMenuItem
                  key={conv.id}
                  className={`flex items-center gap-2 cursor-pointer ${
                    currentConversationId === conv.id ? "bg-violet-100 dark:bg-violet-900/40" : ""
                  }`}
                  onClick={() => selectConversation(conv)}
                >
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{conv.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(conv.updated_at)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* New Conversation Button */}
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 h-9 w-9"
          onClick={startNewConversation}
          title="Nova Conversa"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
        <div className="max-w-2xl mx-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg">
                <Sparkles className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-2 text-center">Olá! Eu sou a Auri</h3>
              <p className="text-muted-foreground text-center max-w-sm">
                Sua assistente inteligente do JTC FluxPDV. Pergunte sobre vendas, clientes, produtos ou qualquer coisa sobre seu negócio!
              </p>
              
              <div className="grid grid-cols-2 gap-3 mt-8 w-full max-w-md">
                {[
                  "Qual foi minha venda de hoje?",
                  "Quem está me devendo?",
                  "Quais produtos estão em baixa?",
                  "Como está meu negócio?"
                ].map((suggestion, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    className="h-auto py-3 px-4 text-left text-sm whitespace-normal"
                    onClick={() => {
                      setInput(suggestion);
                      inputRef.current?.focus();
                    }}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] p-4 rounded-2xl ${
                    message.role === "user"
                      ? "bg-gradient-to-r from-violet-600 to-purple-700 text-white rounded-br-md"
                      : "bg-muted rounded-bl-md"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </div>
              </div>
            ))
          )}
          
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex justify-start">
              <div className="bg-muted p-4 rounded-2xl rounded-bl-md">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                  <span className="text-sm text-muted-foreground">Pensando...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t bg-background shrink-0">
        <div className="max-w-2xl mx-auto flex gap-3">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Digite sua mensagem..."
            disabled={isLoading || contextLoading}
            className="flex-1 h-12 rounded-full px-5 border-2 focus-visible:ring-violet-500"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading || contextLoading}
            className="h-12 w-12 rounded-full bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 shrink-0"
            size="icon"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Auri;
