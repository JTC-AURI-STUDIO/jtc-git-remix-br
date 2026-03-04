-- Tabela para conversas da Auri
CREATE TABLE public.auri_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Nova conversa',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para mensagens das conversas
CREATE TABLE public.auri_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.auri_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.auri_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auri_messages ENABLE ROW LEVEL SECURITY;

-- Políticas para conversas
CREATE POLICY "Users can view own conversations" ON public.auri_conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations" ON public.auri_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON public.auri_conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" ON public.auri_conversations
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas para mensagens (através da conversa)
CREATE POLICY "Users can view own messages" ON public.auri_messages
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.auri_conversations 
    WHERE id = auri_messages.conversation_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own messages" ON public.auri_messages
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.auri_conversations 
    WHERE id = auri_messages.conversation_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own messages" ON public.auri_messages
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.auri_conversations 
    WHERE id = auri_messages.conversation_id AND user_id = auth.uid()
  ));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_auri_conversations_updated_at
  BEFORE UPDATE ON public.auri_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Índices para performance
CREATE INDEX idx_auri_conversations_user_id ON public.auri_conversations(user_id);
CREATE INDEX idx_auri_messages_conversation_id ON public.auri_messages(conversation_id);
